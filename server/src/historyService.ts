// --------------------------------------------------------------------------------------
// ---- GUARDAR UN ANALISIS Y CERRAR UN PR (ESCRITURA DEL HISTORIAL) -------------------
// --------------------------------------------------------------------------------------

import { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { AnalysisInput, FindingInput, MergeInput, RepoInput } from './types';

export interface SaveAnalysisResult {
	duplicate: boolean; //ya existia un analisis de ese commit, no se guardo nada nuevo
	analysisId: number;
	newCount: number; //hallazgos que aparecen por primera vez en este commit
	resolvedCount: number; //hallazgos que estaban abiertos y ya no aparecen
	openCount: number; //hallazgos abiertos despues de este commit
}

export interface CloseResult {
	duplicate: boolean; //ese cierre ya se habia registrado
	skipped: boolean; //no habia nada que cerrar en esa rama
	pullRequestId: number | null;
	detected: number;
	resolved: number;
	unresolved: number;
}

function isDuplicateEntry(error: unknown): boolean {
	return (error as { code?: string }).code === 'ER_DUP_ENTRY';
}

//crea el repo si no existe y regresa su id; si ya existia solo actualiza el nombre
async function upsertRepo(connection: PoolConnection, repo: RepoInput): Promise<number> {
	const [result] = await connection.query<ResultSetHeader>(
		'INSERT INTO repos (name, remote_url) VALUES (?, ?) AS new_repo ' +
		'ON DUPLICATE KEY UPDATE name = new_repo.name, id = LAST_INSERT_ID(id)',
		[repo.name, repo.remoteUrl]
	);
	return result.insertId;
}

async function findAnalysisId(executor: Pool | PoolConnection, repoId: number, commitHash: string): Promise<number | null> {
	const [rows] = await executor.query<RowDataPacket[]>(
		'SELECT id FROM analyses WHERE repo_id = ? AND commit_hash = ?',
		[repoId, commitHash]
	);
	return rows.length > 0 ? (rows[0].id as number) : null;
}

function countBySeverity(findings: FindingInput[]): { high: number; medium: number; low: number } {
	return {
		high: findings.filter(finding => finding.severity === 'Alta').length,
		medium: findings.filter(finding => finding.severity === 'Media').length,
		low: findings.filter(finding => finding.severity === 'Baja').length,
	};
}

//guarda el analisis de un commit y actualiza la vida de cada hallazgo de la rama:
//el que ya estaba abierto y sigue aparece como "persiste", el que ya no aparece se marca resuelto y el que no estaba se agrega
export async function saveAnalysis(pool: Pool, input: AnalysisInput): Promise<SaveAnalysisResult> {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();
		const repoId = await upsertRepo(connection, input.repo);

		const existingId = await findAnalysisId(connection, repoId, input.commit.hash);
		if (existingId !== null) {
			await connection.commit();
			return { duplicate: true, analysisId: existingId, newCount: 0, resolvedCount: 0, openCount: 0 };
		}

		//hallazgos abiertos de los commits anteriores de esta rama (su PR todavia no se cierra)
		const [openRows] = await connection.query<RowDataPacket[]>(
			'SELECT id, fingerprint, line, severity, message FROM findings ' +
			'WHERE repo_id = ? AND branch = ? AND pull_request_id IS NULL AND resolved_analysis_id IS NULL',
			[repoId, input.branch]
		);
		const openByFingerprint = new Map<string, RowDataPacket>();
		for (const row of openRows) {
			if (!openByFingerprint.has(row.fingerprint)) { openByFingerprint.set(row.fingerprint, row); }
		}

		const incoming = new Set(input.findings.map(finding => finding.fingerprint));
		const persisted = input.findings.filter(finding => openByFingerprint.has(finding.fingerprint));
		const added = input.findings.filter(finding => !openByFingerprint.has(finding.fingerprint));
		const resolvedIds = openRows.filter(row => !incoming.has(row.fingerprint)).map(row => row.id as number);
		const counts = countBySeverity(input.findings);

		let analysisId: number;
		try {
			const [inserted] = await connection.query<ResultSetHeader>(
				'INSERT INTO analyses (repo_id, branch, commit_hash, commit_subject, author_name, author_email, analyzed_at, ' +
				'extension_version, high_count, medium_count, low_count, new_count, resolved_count) ' +
				'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[
					repoId, input.branch, input.commit.hash, input.commit.subject, input.commit.authorName, input.commit.authorEmail,
					input.analyzedAt, input.extensionVersion, counts.high, counts.medium, counts.low, added.length, resolvedIds.length,
				]
			);
			analysisId = inserted.insertId;
		} catch (error) {
			//dos equipos mandaron el mismo commit al mismo tiempo, se queda el primero
			if (!isDuplicateEntry(error)) { throw error; }
			await connection.rollback();
			const concurrentId = await findAnalysisId(pool, repoId, input.commit.hash);
			return { duplicate: true, analysisId: concurrentId ?? 0, newCount: 0, resolvedCount: 0, openCount: 0 };
		}

		if (persisted.length > 0) {
			const persistedIds = persisted.map(finding => openByFingerprint.get(finding.fingerprint)!.id as number);
			await connection.query('UPDATE findings SET last_analysis_id = ? WHERE id IN (?)', [analysisId, persistedIds]);

			//si cambio de linea, de prioridad o de texto se actualiza para que el detalle muestre lo ultimo que se vio
			for (const finding of persisted) {
				const row = openByFingerprint.get(finding.fingerprint)!;
				if (row.line !== finding.line || row.severity !== finding.severity || row.message !== finding.message) {
					await connection.query(
						'UPDATE findings SET line = ?, severity = ?, message = ?, suggestion = ? WHERE id = ?',
						[finding.line, finding.severity, finding.message, finding.suggestion, row.id]
					);
				}
			}
		}

		if (resolvedIds.length > 0) {
			await connection.query('UPDATE findings SET resolved_analysis_id = ? WHERE id IN (?)', [analysisId, resolvedIds]);
		}

		if (added.length > 0) {
			const rows = added.map(finding => [
				repoId, input.branch, finding.fingerprint, finding.file, finding.line, finding.rule, finding.severity,
				finding.message, finding.suggestion, analysisId, analysisId,
			]);
			await connection.query(
				'INSERT INTO findings (repo_id, branch, fingerprint, file, line, rule, severity, message, suggestion, ' +
				'first_analysis_id, last_analysis_id) VALUES ?',
				[rows]
			);
		}

		await connection.commit();
		return { duplicate: false, analysisId, newCount: added.length, resolvedCount: resolvedIds.length, openCount: input.findings.length };
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}
}

//estadisticas de los hallazgos de un PR ya cerrado
async function pullRequestStats(executor: Pool | PoolConnection, pullRequestId: number): Promise<{ detected: number; resolved: number; unresolved: number }> {
	const [rows] = await executor.query<RowDataPacket[]>(
		'SELECT COUNT(*) AS detected, COUNT(resolved_analysis_id) AS resolved FROM findings WHERE pull_request_id = ?',
		[pullRequestId]
	);
	const detected = Number(rows[0].detected);
	const resolved = Number(rows[0].resolved);
	return { detected, resolved, unresolved: detected - resolved };
}

//cierra el ciclo de una rama cuando su PR se mergeo: sus commits y hallazgos pasan a ese PR y la rama queda libre
//para un ciclo nuevo (en este equipo la misma rama se reutiliza en cada PR)
export async function closePullRequest(pool: Pool, input: MergeInput): Promise<CloseResult> {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();

		const [repoRows] = await connection.query<RowDataPacket[]>('SELECT id FROM repos WHERE remote_url = ?', [input.repo.remoteUrl]);
		if (repoRows.length === 0) {
			await connection.commit();
			return { duplicate: false, skipped: true, pullRequestId: null, detected: 0, resolved: 0, unresolved: 0 };
		}
		const repoId = repoRows[0].id as number;

		//el commit que se avisa debe estar registrado: de ahi se sabe a que ciclo pertenece y hasta donde se cierra
		//(el commit del merge, o uno que nunca se analizo, no cierra nada)
		const [analysisRows] = await connection.query<RowDataPacket[]>(
			'SELECT id, branch, pull_request_id FROM analyses WHERE repo_id = ? AND commit_hash = ?',
			[repoId, input.lastCommit]
		);
		if (analysisRows.length === 0) {
			await connection.commit();
			return { duplicate: false, skipped: true, pullRequestId: null, detected: 0, resolved: 0, unresolved: 0 };
		}
		const lastAnalysisId = analysisRows[0].id as number;
		const branch = analysisRows[0].branch as string;

		//si ese commit ya pertenece a un PR cerrado el aviso es un repetido (puede llegar de varios equipos), no se vuelve a cerrar nada
		if (analysisRows[0].pull_request_id !== null) {
			const closedId = analysisRows[0].pull_request_id as number;
			const stats = await pullRequestStats(connection, closedId);
			await connection.commit();
			return { duplicate: true, skipped: false, pullRequestId: closedId, ...stats };
		}

		const [inserted] = await connection.query<ResultSetHeader>(
			"INSERT INTO pull_requests (repo_id, branch, last_commit, is_merged, merged_at) VALUES (?, ?, ?, b'1', ?)",
			[repoId, branch, input.lastCommit, input.mergedAt]
		);
		const pullRequestId = inserted.insertId;

		//si el aviso llego tarde y ya se habian registrado commits nuevos de la rama, los hallazgos que esos commits "resolvieron"
		//solo dejaron de aparecer porque empezo otro ciclo: al momento del merge seguian abiertos
		await connection.query(
			'UPDATE findings SET resolved_analysis_id = NULL ' +
			'WHERE repo_id = ? AND branch = ? AND pull_request_id IS NULL AND first_analysis_id <= ? AND resolved_analysis_id > ?',
			[repoId, branch, lastAnalysisId, lastAnalysisId]
		);

		//el PR se lleva los commits y hallazgos de la rama hasta el commit avisado; lo que se registro despues queda como ciclo nuevo
		await connection.query(
			'UPDATE findings SET pull_request_id = ? WHERE repo_id = ? AND branch = ? AND pull_request_id IS NULL AND first_analysis_id <= ?',
			[pullRequestId, repoId, branch, lastAnalysisId]
		);
		await connection.query(
			'UPDATE analyses SET pull_request_id = ? WHERE repo_id = ? AND branch = ? AND pull_request_id IS NULL AND id <= ?',
			[pullRequestId, repoId, branch, lastAnalysisId]
		);

		const stats = await pullRequestStats(connection, pullRequestId);
		await connection.commit();
		return { duplicate: false, skipped: false, pullRequestId, ...stats };
	} catch (error) {
		await connection.rollback();
		//dos equipos cerraron el mismo PR al mismo tiempo, el segundo se toma como repetido
		if (isDuplicateEntry(error)) {
			return { duplicate: true, skipped: false, pullRequestId: null, detected: 0, resolved: 0, unresolved: 0 };
		}
		throw error;
	} finally {
		connection.release();
	}
}
