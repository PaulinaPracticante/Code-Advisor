// --------------------------------------------------------------------------------------
// ---- CONSULTAS DEL HISTORIAL (LO QUE VE EL GERENTE EN EL PANEL) ---------------------
// --------------------------------------------------------------------------------------

import { Pool, RowDataPacket } from 'mysql2/promise';

export type CycleState = 'all' | 'open' | 'merged';

export interface CycleFilters {
	repoId?: number;
	state: CycleState;
	search?: string;
	limit: number;
	offset: number;
}

const WEEKS_IN_TREND = 6;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

//los comodines de LIKE (% _ \) escritos por el usuario se buscan como texto normal
function escapeLike(text: string): string {
	return text.replace(/[\\%_]/g, character => '\\' + character);
}

function toIso(value: unknown): string | null {
	return value instanceof Date ? value.toISOString() : null;
}

export async function listRepos(pool: Pool): Promise<Array<{ id: number; name: string; remoteUrl: string }>> {
	const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name, remote_url FROM repos ORDER BY name');
	return rows.map(row => ({ id: row.id as number, name: row.name as string, remoteUrl: row.remote_url as string }));
}

//ciclos (una rama con su PR abierto, o un PR ya mergeado) con cuantos hallazgos se detectaron, corrigieron y quedaron sin corregir
export async function listCycles(pool: Pool, filters: CycleFilters) {
	const where: string[] = [];
	const params: unknown[] = [];

	if (filters.repoId !== undefined) {
		where.push('c.repo_id = ?');
		params.push(filters.repoId);
	}
	if (filters.state === 'open') { where.push('c.pull_request_id IS NULL'); }
	if (filters.state === 'merged') { where.push('c.pull_request_id IS NOT NULL'); }

	//busca en el nombre de la rama y en los commits del ciclo (mensaje, autor o hash), sin importar mayusculas
	if (filters.search) {
		const like = `%${escapeLike(filters.search.toLowerCase())}%`;
		where.push(
			'(LOWER(c.branch) LIKE ? OR EXISTS (SELECT 1 FROM analyses a2 WHERE a2.repo_id = c.repo_id AND a2.branch = c.branch ' +
			'AND a2.pull_request_id <=> c.pull_request_id AND (LOWER(a2.commit_subject) LIKE ? OR LOWER(a2.author_name) LIKE ? ' +
			'OR LOWER(a2.commit_hash) LIKE ?)))'
		);
		params.push(like, like, like, like);
	}

	const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
	const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM view_cycle_summary c ${whereSql}`, params);
	const [rows] = await pool.query<RowDataPacket[]>(
		`SELECT c.* FROM view_cycle_summary c ${whereSql} ORDER BY c.last_analyzed_at DESC, c.branch LIMIT ? OFFSET ?`,
		[...params, filters.limit, filters.offset]
	);

	return {
		total: Number(countRows[0].total),
		items: rows.map(row => ({
			repoId: row.repo_id as number,
			repoName: row.repo_name as string,
			branch: row.branch as string,
			pullRequestId: row.pull_request_id === null ? null : (row.pull_request_id as number),
			state: row.pull_request_id === null ? 'open' : 'merged',
			mergedAt: toIso(row.merged_at),
			commitCount: Number(row.commit_count),
			firstAnalyzedAt: toIso(row.first_analyzed_at),
			lastAnalyzedAt: toIso(row.last_analyzed_at),
			detected: Number(row.detected_count),
			resolved: Number(row.resolved_count),
			unresolved: Number(row.unresolved_count),
			detectedBySeverity: {
				Alta: Number(row.detected_high),
				Media: Number(row.detected_medium),
				Baja: Number(row.detected_low),
			},
		})),
	};
}

//commits analizados de un ciclo, del mas viejo al mas nuevo; las cuentas A/M/B son los hallazgos abiertos en ese commit
export async function listCycleCommits(pool: Pool, repoId: number, branch: string, pullRequestId: number | null) {
	const [rows] = await pool.query<RowDataPacket[]>(
		'SELECT id, commit_hash, commit_subject, author_name, analyzed_at, high_count, medium_count, low_count, new_count, resolved_count ' +
		'FROM analyses WHERE repo_id = ? AND branch = ? AND pull_request_id <=> ? ORDER BY analyzed_at ASC, id ASC',
		[repoId, branch, pullRequestId]
	);

	return rows.map(row => ({
		analysisId: row.id as number,
		commitHash: row.commit_hash as string,
		subject: row.commit_subject as string,
		authorName: row.author_name as string,
		analyzedAt: toIso(row.analyzed_at),
		open: { Alta: Number(row.high_count), Media: Number(row.medium_count), Baja: Number(row.low_count) },
		newCount: Number(row.new_count),
		resolvedCount: Number(row.resolved_count),
	}));
}

//hallazgos de un commit: los que seguian abiertos (nuevos o que persisten) y los que se resolvieron justo en ese commit
export async function listAnalysisFindings(pool: Pool, analysisId: number) {
	const [rows] = await pool.query<RowDataPacket[]>(
		'SELECT f.file, f.line, f.rule, f.severity, f.message, f.suggestion, f.first_analysis_id, f.resolved_analysis_id ' +
		'FROM findings f JOIN analyses a ON a.id = ? ' +
		'WHERE f.repo_id = a.repo_id AND f.branch = a.branch AND f.pull_request_id <=> a.pull_request_id ' +
		'AND ((f.first_analysis_id <= a.id AND (f.resolved_analysis_id IS NULL OR f.resolved_analysis_id > a.id)) ' +
		'OR f.resolved_analysis_id = a.id) ' +
		'ORDER BY f.severity, f.file, f.line',
		[analysisId]
	);

	return rows.map(row => ({
		file: row.file as string,
		line: row.line === null ? null : (row.line as number),
		rule: row.rule as string,
		severity: row.severity as string,
		message: row.message as string,
		suggestion: row.suggestion === null ? null : (row.suggestion as string),
		status: row.resolved_analysis_id === analysisId ? 'resolved' : row.first_analysis_id === analysisId ? 'new' : 'persisting',
	}));
}

//lunes (en UTC) de la semana de una fecha, en formato AAAA-MM-DD
function mondayOf(date: Date): string {
	const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
	return monday.toISOString().slice(0, 10);
}

//indicadores del resumen: abiertos ahora, corregidos y llegados a main sin corregir en los ultimos "days" dias,
//las reglas que mas se incumplen y la tendencia por semana
export async function getSummary(pool: Pool, repoId: number | undefined, days: number) {
	const now = Date.now();
	const since = new Date(now - days * DAY_IN_MS);
	const previousSince = new Date(now - 2 * days * DAY_IN_MS);
	const repoFilter = repoId === undefined ? '' : ' AND v.repo_id = ?';
	const repoParams = repoId === undefined ? [] : [repoId];

	const count = async (condition: string, params: unknown[]): Promise<number> => {
		const [rows] = await pool.query<RowDataPacket[]>(
			`SELECT COUNT(*) AS total FROM view_finding_history v WHERE ${condition}${repoFilter}`,
			[...params, ...repoParams]
		);
		return Number(rows[0].total);
	};

	const [openRows] = await pool.query<RowDataPacket[]>(
		'SELECT COUNT(*) AS total, ' +
		"COUNT(CASE WHEN v.severity = 'Alta' THEN 1 END) AS high, " +
		"COUNT(CASE WHEN v.severity = 'Media' THEN 1 END) AS medium, " +
		"COUNT(CASE WHEN v.severity = 'Baja' THEN 1 END) AS low " +
		`FROM view_finding_history v WHERE v.pull_request_id IS NULL AND v.resolved_at IS NULL${repoFilter}`,
		repoParams
	);

	const [commitRows] = await pool.query<RowDataPacket[]>(
		`SELECT COUNT(*) AS total FROM analyses v WHERE v.analyzed_at >= ?${repoFilter}`,
		[since, ...repoParams]
	);
	const [cycleRows] = await pool.query<RowDataPacket[]>(
		`SELECT COUNT(*) AS total FROM view_cycle_summary v WHERE v.last_analyzed_at >= ?${repoFilter}`,
		[since, ...repoParams]
	);

	const [topRows] = await pool.query<RowDataPacket[]>(
		'SELECT v.rule AS rule, COUNT(*) AS total FROM view_finding_history v ' +
		`WHERE v.first_seen_at >= ?${repoFilter} GROUP BY v.rule ORDER BY total DESC, v.rule ASC LIMIT 5`,
		[since, ...repoParams]
	);

	//tendencia: hallazgos detectados y corregidos por semana, las ultimas semanas aunque alguna no tenga nada
	const weeks: string[] = [];
	const currentMonday = new Date(mondayOf(new Date(now)) + 'T00:00:00Z');
	for (let index = WEEKS_IN_TREND - 1; index >= 0; index--) {
		weeks.push(mondayOf(new Date(currentMonday.getTime() - index * 7 * DAY_IN_MS)));
	}
	const weeklySince = new Date(weeks[0] + 'T00:00:00Z');
	const weekly = async (column: 'first_seen_at' | 'resolved_at'): Promise<Map<string, number>> => {
		const [rows] = await pool.query<RowDataPacket[]>(
			`SELECT DATE_SUB(DATE(v.${column}), INTERVAL WEEKDAY(v.${column}) DAY) AS week_start, COUNT(*) AS total ` +
			`FROM view_finding_history v WHERE v.${column} >= ?${repoFilter} GROUP BY week_start`,
			[weeklySince, ...repoParams]
		);
		return new Map(rows.map(row => [toIso(row.week_start)!.slice(0, 10), Number(row.total)]));
	};
	const detectedByWeek = await weekly('first_seen_at');
	const resolvedByWeek = await weekly('resolved_at');

	return {
		days,
		open: {
			total: Number(openRows[0].total),
			Alta: Number(openRows[0].high),
			Media: Number(openRows[0].medium),
			Baja: Number(openRows[0].low),
		},
		detected: await count('v.first_seen_at >= ?', [since]),
		resolved: await count('v.resolved_at >= ?', [since]),
		resolvedPrevious: await count('v.resolved_at >= ? AND v.resolved_at < ?', [previousSince, since]),
		reachedMain: await count('v.pull_request_id IS NOT NULL AND v.resolved_at IS NULL AND v.merged_at >= ?', [since]),
		commitCount: Number(commitRows[0].total),
		cycleCount: Number(cycleRows[0].total),
		topRules: topRows.map(row => ({ rule: row.rule as string, count: Number(row.total) })),
		weekly: weeks.map(week => ({ weekStart: week, detected: detectedByWeek.get(week) ?? 0, resolved: resolvedByWeek.get(week) ?? 0 })),
	};
}
