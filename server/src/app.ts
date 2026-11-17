import { createHash, timingSafeEqual } from 'crypto';
import express, { Express, NextFunction, Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { HttpError } from './errors';
import { createRouter } from './routes';

export interface AppOptions {
	apiToken?: string; //si viene, todas las rutas (menos /api/health) piden este valor en el encabezado x-api-token
}

//compara dos textos sin que el tiempo de respuesta revele cuantos caracteres coinciden
function sameToken(received: string, expected: string): boolean {
	const receivedHash = createHash('sha256').update(received).digest();
	const expectedHash = createHash('sha256').update(expected).digest();
	return timingSafeEqual(receivedHash, expectedHash);
}

function requireToken(apiToken: string | undefined) {
	return (request: Request, _response: Response, next: NextFunction): void => {
		if (!apiToken) {
			next();
			return;
		}
		const received = request.header('x-api-token') ?? '';
		next(sameToken(received, apiToken) ? undefined : new HttpError(401, 'Falta el token de la API o no es correcto'));
	};
}

//errores en formato JSON: los que se lanzan con HttpError traen su codigo, los demas son 500 sin detalles para el cliente
function handleError(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
	const known = error as { status?: number; type?: string; message?: string };
	if (error instanceof HttpError) {
		response.status(error.status).json({ error: error.message });
	} else if (known.type === 'entity.parse.failed') {
		response.status(400).json({ error: 'El cuerpo no es un JSON valido' });
	} else if (known.type === 'entity.too.large') {
		response.status(413).json({ error: 'El cuerpo es demasiado grande' });
	} else {
		console.error('Error en la API del historial:', error);
		response.status(500).json({ error: 'Error interno de la API' });
	}
}

export function createApp(pool: Pool, options: AppOptions = {}): Express {
	const app = express();
	app.disable('x-powered-by');
	app.use(express.json({ limit: '2mb' }));

	//no pide token para que se pueda revisar que la API y la base de datos estan arriba
	app.get('/api/health', async (_request, response) => {
		try {
			await pool.query('SELECT 1');
			response.json({ ok: true });
		} catch {
			response.status(503).json({ ok: false });
		}
	});

	app.use('/api', requireToken(options.apiToken));
	app.use('/api', createRouter(pool));
	app.use((_request, _response, next) => next(new HttpError(404, 'Ruta no encontrada')));
	app.use(handleError);
	return app;
}
