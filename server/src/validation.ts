// --------------------------------------------------------------------------------------
// ---- VALIDACION DE LO QUE LLEGA A LA API --------------------------------------------
// --------------------------------------------------------------------------------------

import { HttpError } from './errors';
import { AnalysisInput, FindingInput, MergeInput, RepoInput, SEVERITIES, Severity } from './types';

const MAX_FINDINGS = 5000;
const MAX_STANDARS_BYTES = 200_000;

function badRequest(message: string): never {
	throw new HttpError(400, message);
}

function isObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

//lee un texto obligatorio, si es mas largo de lo que cabe en la columna lo recorta
function readText(source: Record<string, unknown>, key: string, max: number, label: string): string {
	const value = source[key];
	if (typeof value !== 'string' || value.trim() === '') {
		return badRequest(`${label} es obligatorio`);
	}
	return value.trim().slice(0, max);
}

//lee un texto que puede faltar, regresa null si no viene
function readOptionalText(source: Record<string, unknown>, key: string, max: number): string | null {
	const value = source[key];
	if (typeof value !== 'string' || value.trim() === '') { return null; }
	return value.trim().slice(0, max);
}

function readRepo(value: unknown): RepoInput {
	if (!isObject(value)) { return badRequest('repo es obligatorio'); }
	return {
		name: readText(value, 'name', 200, 'repo.name'),
		remoteUrl: readText(value, 'remoteUrl', 500, 'repo.remoteUrl'),
	};
}

function readDate(value: unknown, label: string): Date {
	const date = typeof value === 'string' ? new Date(value) : new Date(Number.NaN);
	if (Number.isNaN(date.getTime())) { return badRequest(`${label} no es una fecha valida`); }
	return date;
}

function readCommitHash(value: unknown, label: string): string {
	if (typeof value !== 'string' || !/^[0-9a-fA-F]{40}$/.test(value)) {
		return badRequest(`${label} debe ser un hash de git de 40 caracteres`);
	}
	return value.toLowerCase();
}

function parseFinding(item: unknown, index: number): FindingInput {
	if (!isObject(item)) { return badRequest(`findings[${index}] debe ser un objeto`); }

	const fingerprint = item.fingerprint;
	if (typeof fingerprint !== 'string' || !/^[0-9a-fA-F]{64}$/.test(fingerprint)) {
		return badRequest(`findings[${index}].fingerprint debe tener 64 caracteres hexadecimales`);
	}

	const severity = item.severity;
	if (typeof severity !== 'string' || !SEVERITIES.includes(severity as Severity)) {
		return badRequest(`findings[${index}].severity debe ser Alta, Media o Baja`);
	}

	let line: number | null = null;
	if (item.line !== undefined && item.line !== null) {
		if (typeof item.line !== 'number' || !Number.isInteger(item.line) || item.line < 0 || item.line > 2147483647) {
			return badRequest(`findings[${index}].line debe ser un entero mayor o igual a 0`);
		}
		line = item.line;
	}

	return {
		fingerprint: fingerprint.toLowerCase(),
		file: readText(item, 'file', 500, `findings[${index}].file`),
		line,
		rule: readText(item, 'rule', 100, `findings[${index}].rule`),
		severity: severity as Severity,
		message: readText(item, 'message', 2000, `findings[${index}].message`),
		suggestion: readOptionalText(item, 'suggestion', 2000),
	};
}

//si llegan dos hallazgos con el mismo fingerprint se queda con el primero
function dedupeFindings(findings: FindingInput[]): FindingInput[] {
	const seen = new Set<string>();
	return findings.filter(finding => {
		if (seen.has(finding.fingerprint)) { return false; }
		seen.add(finding.fingerprint);
		return true;
	});
}

export function parseAnalysis(body: unknown): AnalysisInput {
	if (!isObject(body)) { return badRequest('el cuerpo debe ser un objeto JSON'); }
	if (!isObject(body.commit)) { return badRequest('commit es obligatorio'); }
	if (!Array.isArray(body.findings)) { return badRequest('findings debe ser un arreglo'); }
	if (body.findings.length > MAX_FINDINGS) { return badRequest(`findings no puede tener mas de ${MAX_FINDINGS} elementos`); }

	const commit = body.commit;
	return {
		repo: readRepo(body.repo),
		branch: readText(body, 'branch', 255, 'branch'),
		commit: {
			hash: readCommitHash(commit.hash, 'commit.hash'),
			subject: readOptionalText(commit, 'subject', 500) ?? '',
			authorName: readOptionalText(commit, 'authorName', 200) ?? '',
			authorEmail: readOptionalText(commit, 'authorEmail', 255) ?? '',
		},
		analyzedAt: readDate(body.analyzedAt, 'analyzedAt'),
		extensionVersion: readOptionalText(body, 'extensionVersion', 40) ?? '',
		findings: dedupeFindings(body.findings.map(parseFinding)),
	};
}

export function parseMerge(body: unknown): MergeInput {
	if (!isObject(body)) { return badRequest('el cuerpo debe ser un objeto JSON'); }
	return {
		repo: readRepo(body.repo),
		branch: readText(body, 'branch', 255, 'branch'),
		lastCommit: readCommitHash(body.lastCommit, 'lastCommit'),
		mergedAt: body.mergedAt === undefined ? new Date() : readDate(body.mergedAt, 'mergedAt'),
	};
}

//lee un entero de la direccion (query string), si no viene o no es valido usa el valor por defecto
export function readInt(value: unknown, fallback: number, min: number, max: number): number {
	const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
	if (Number.isNaN(parsed)) { return fallback; }
	return Math.min(Math.max(parsed, min), max);
}

//valida lo que manda el panel al guardar
export function parseStandardsContent(body: unknown): Record<string, unknown> {
	if (!isObject(body) || !isObject(body.content)) {
		return badRequest('content es obligatorio y debe ser un objeto');
	}
	if (JSON.stringify(body.content).length > MAX_STANDARS_BYTES) {
		return badRequest('content es demasiado grande');
	}
	return body.content as Record<string, unknown>;
}