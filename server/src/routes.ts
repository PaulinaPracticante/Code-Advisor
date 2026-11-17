// --------------------------------------------------------------------------------------
// ---- RUTAS DE LA API: ESCRITURA (LA EXTENSION) Y LECTURA (EL PANEL DEL GERENTE) ------
// --------------------------------------------------------------------------------------

import { NextFunction, Request, Response, Router } from 'express';
import { Pool } from 'mysql2/promise';
import { HttpError } from './errors';
import { closePullRequest, saveAnalysis } from './historyService';
import { CycleState, getSummary, listAnalysisFindings, listCycleCommits, listCycles, listRepos } from './queryService';
import { getCurrentStandards, listStandardsHistory, saveStandards } from './standardsService';
import { parseAnalysis, parseMerge, parseStandardsContent, readInt } from './validation';

type Handler = (request: Request, response: Response) => Promise<void>;

//manda los errores de las funciones async al manejador de errores de express
function wrap(handler: Handler) {
	return (request: Request, response: Response, next: NextFunction): void => {
		handler(request, response).catch(next);
	};
}

function readRequiredInt(value: unknown, label: string): number {
	const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
	if (Number.isNaN(parsed) || parsed < 0) { throw new HttpError(400, `${label} debe ser un numero`); }
	return parsed;
}

function readState(value: unknown): CycleState {
	return value === 'open' || value === 'merged' ? value : 'all';
}

export function createRouter(pool: Pool): Router {
	const router = Router();

	//la extension manda el analisis de un commit
	router.post('/analyses', wrap(async (request, response) => {
		const result = await saveAnalysis(pool, parseAnalysis(request.body));
		response.status(result.duplicate ? 200 : 201).json(result);
	}));

	//la extension avisa que el PR de una rama ya se mergeo
	router.post('/pull-requests/merged', wrap(async (request, response) => {
		const result = await closePullRequest(pool, parseMerge(request.body));
		response.status(result.duplicate || result.skipped ? 200 : 201).json(result);
	}));

	router.get('/history/repos', wrap(async (_request, response) => {
		response.json(await listRepos(pool));
	}));

	router.get('/history/summary', wrap(async (request, response) => {
		const repoId = request.query.repoId === undefined ? undefined : readRequiredInt(request.query.repoId, 'repoId');
		response.json(await getSummary(pool, repoId, readInt(request.query.days, 30, 1, 365)));
	}));

	router.get('/history/cycles', wrap(async (request, response) => {
		const search = typeof request.query.search === 'string' ? request.query.search.trim().slice(0, 100) : '';
		response.json(await listCycles(pool, {
			repoId: request.query.repoId === undefined ? undefined : readRequiredInt(request.query.repoId, 'repoId'),
			state: readState(request.query.state),
			search: search === '' ? undefined : search,
			limit: readInt(request.query.limit, 10, 1, 50),
			offset: readInt(request.query.offset, 0, 0, 1000000),
		}));
	}));

	//commits de un ciclo; sin pullRequestId es el ciclo abierto de la rama
	router.get('/history/cycles/commits', wrap(async (request, response) => {
		const branch = typeof request.query.branch === 'string' ? request.query.branch : '';
		if (branch === '') { throw new HttpError(400, 'branch es obligatorio'); }
		const pullRequestId = request.query.pullRequestId === undefined || request.query.pullRequestId === 'open'
			? null
			: readRequiredInt(request.query.pullRequestId, 'pullRequestId');
		response.json(await listCycleCommits(pool, readRequiredInt(request.query.repoId, 'repoId'), branch, pullRequestId));
	}));

	router.get('/history/analyses/:id/findings', wrap(async (request, response) => {
		response.json(await listAnalysisFindings(pool, readRequiredInt(request.params.id, 'id')));
	}));

	//la extension consulta los estandares vigentes al cargar la configuracion
	router.get('/standards', wrap(async (_request, response) => {
		const current = await getCurrentStandards(pool);
		response.json({ content: current?.content ?? {}, updatedAt: current?.createdAt ?? null });
	}));

	//el panel del gerente guarda una version nueva, nunca pisa las anteriores
	router.post('/standards', wrap(async (request, response) => {
		const content = parseStandardsContent(request.body);
		const version = await saveStandards(pool, content);
		response.status(201).json({ id: version.id, createdAt: version.createdAt });
	}));

	//versiones anteriores, de la mas nueva a la mas vieja
	router.get('/standards/history', wrap(async (request, response) => {
		response.json(await listStandardsHistory(pool, readInt(request.query.limit, 20, 1, 100)));
	}));

	return router;
}
