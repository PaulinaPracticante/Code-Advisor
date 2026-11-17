// --------------------------------------------------------------------------------------
// ---- PRUEBAS DE LA API CONTRA UN MYSQL 8 REAL ----------------------------------------
// Corren sobre una base de datos temporal (se crea y se borra sola). Variables de entorno:
// TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER y TEST_DB_PASSWORD (el usuario debe poder crear bases de datos).
// Sin TEST_DB_USER las pruebas se omiten.
// --------------------------------------------------------------------------------------

import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { createConnection, Pool } from 'mysql2/promise';
import { createApp } from '../src/app';
import { createPool, initDatabase } from '../src/db';

const TOKEN = 'token-de-prueba';
const DB_CONFIG = {
	host: process.env.TEST_DB_HOST ?? '127.0.0.1',
	port: Number.parseInt(process.env.TEST_DB_PORT ?? '3306', 10),
	user: process.env.TEST_DB_USER ?? '',
	password: process.env.TEST_DB_PASSWORD ?? '',
	database: `codeadvisor_test_${randomBytes(4).toString('hex')}`,
};
const REPO = { name: 'Code-Advisor', remoteUrl: 'https://github.com/PaulinaPracticante/Code-Advisor' };

const fingerprint = (n: number): string => createHash('sha256').update('hallazgo' + n).digest('hex');
const commitHash = (n: number): string => createHash('sha1').update('commit' + n).digest('hex');

function finding(n: number, overrides: Record<string, unknown> = {}) {
	return {
		fingerprint: fingerprint(n),
		file: `Service${n}.cs`,
		line: 10 + n,
		rule: 'indentation',
		severity: 'Media',
		message: `Hallazgo ${n}`,
		suggestion: 'Corrígelo',
		...overrides,
	};
}

function analysis(commitNumber: number, findings: unknown[], overrides: Record<string, unknown> = {}) {
	return {
		repo: REPO,
		branch: 'prueba',
		commit: { hash: commitHash(commitNumber), subject: `ABCD:Commit ${commitNumber}`, authorName: 'Pau1824', authorEmail: 'pau@example.com' },
		analyzedAt: new Date(Date.now() + commitNumber * 1000).toISOString(),
		extensionVersion: '0.0.1',
		findings,
		...overrides,
	};
}

describe('API del historial', { skip: DB_CONFIG.user === '' ? 'falta TEST_DB_USER' : false }, () => {
	let pool: Pool;
	let server: Server;
	let baseUrl: string;
	let repoId = 0;

	//llama a la API con el token correcto, regresa el codigo y el JSON
	async function call(method: string, path: string, body?: unknown, token: string | null = TOKEN): Promise<{ status: number; body: any }> {
		const headers: Record<string, string> = { 'content-type': 'application/json' };
		if (token !== null) { headers['x-api-token'] = token; }
		const response = await fetch(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
		return { status: response.status, body: await response.json() };
	}

	before(async () => {
		await initDatabase(DB_CONFIG);
		pool = createPool(DB_CONFIG);
		server = createApp(pool, { apiToken: TOKEN }).listen(0);
		await new Promise(resolve => server.once('listening', resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	after(async () => {
		await new Promise(resolve => server.close(resolve));
		await pool.end();
		const connection = await createConnection({ host: DB_CONFIG.host, port: DB_CONFIG.port, user: DB_CONFIG.user, password: DB_CONFIG.password });
		await connection.query(`DROP DATABASE IF EXISTS \`${DB_CONFIG.database}\``);
		await connection.end();
	});

	describe('acceso y validacion', () => {
		it('health responde sin token', async () => {
			const result = await call('GET', '/api/health', undefined, null);
			assert.equal(result.status, 200);
			assert.deepEqual(result.body, { ok: true });
		});

		it('sin token o con token incorrecto responde 401', async () => {
			assert.equal((await call('GET', '/api/history/repos', undefined, null)).status, 401);
			assert.equal((await call('GET', '/api/history/repos', undefined, 'otro')).status, 401);
			assert.equal((await call('POST', '/api/analyses', analysis(1, []), null)).status, 401);
		});

		it('sin API_TOKEN configurado la API no pide nada', async () => {
			const openServer = createApp(pool).listen(0);
			await new Promise(resolve => openServer.once('listening', resolve));
			const response = await fetch(`http://127.0.0.1:${(openServer.address() as AddressInfo).port}/api/history/repos`);
			assert.equal(response.status, 200);
			await new Promise(resolve => openServer.close(resolve));
		});

		it('los datos invalidos responden 400 con un mensaje', async () => {
			const bad: Array<[string, unknown]> = [
				['hash de commit invalido', analysis(1, [], { commit: { hash: 'abc', subject: '', authorName: '', authorEmail: '' } })],
				['severidad invalida', analysis(1, [finding(1, { severity: 'Critica' })])],
				['fingerprint invalido', analysis(1, [finding(1, { fingerprint: 'corto' })])],
				['findings no es arreglo', analysis(1, [], { findings: 'nada' })],
				['linea negativa', analysis(1, [finding(1, { line: -3 })])],
				['linea que no es entero', analysis(1, [finding(1, { line: 2.5 })])],
				['rama vacia', analysis(1, [], { branch: '   ' })],
				['sin repo', analysis(1, [], { repo: undefined })],
				['fecha invalida', analysis(1, [], { analyzedAt: 'ayer' })],
				['mensaje vacio', analysis(1, [finding(1, { message: '' })])],
			];
			for (const [name, payload] of bad) {
				const result = await call('POST', '/api/analyses', payload);
				assert.equal(result.status, 400, name);
				assert.equal(typeof result.body.error, 'string', name);
			}
		});

		it('un cuerpo que no es JSON responde 400 y una ruta que no existe 404', async () => {
			const response = await fetch(baseUrl + '/api/analyses', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-token': TOKEN }, body: '{ roto' });
			assert.equal(response.status, 400);
			assert.equal((await call('GET', '/api/no-existe')).status, 404);
		});
	});

	describe('vida de los hallazgos en una rama', () => {
		it('primer commit: todos los hallazgos son nuevos', async () => {
			const result = await call('POST', '/api/analyses', analysis(1, [finding(1), finding(2), finding(3, { severity: 'Alta', rule: 'transactions' })]));
			assert.equal(result.status, 201);
			assert.equal(result.body.duplicate, false);
			assert.equal(result.body.newCount, 3);
			assert.equal(result.body.resolvedCount, 0);
			assert.equal(result.body.openCount, 3);
		});

		it('mandar el mismo commit otra vez es un duplicado y no cambia nada', async () => {
			const first = await call('POST', '/api/analyses', analysis(1, [finding(9)]));
			assert.equal(first.status, 200);
			assert.equal(first.body.duplicate, true);
			assert.ok(first.body.analysisId > 0);
		});

		it('segundo commit: uno persiste (aunque cambie de linea), uno se resuelve y uno es nuevo', async () => {
			const result = await call('POST', '/api/analyses', analysis(2, [finding(2), finding(3, { severity: 'Alta', rule: 'transactions', line: 99 }), finding(4)]));
			assert.equal(result.status, 201);
			assert.equal(result.body.newCount, 1, 'solo el hallazgo 4 es nuevo');
			assert.equal(result.body.resolvedCount, 1, 'el hallazgo 1 ya no aparece');
			assert.equal(result.body.openCount, 3);
		});

		it('tercer commit: se resuelve otro hallazgo', async () => {
			const result = await call('POST', '/api/analyses', analysis(3, [finding(3, { severity: 'Alta', rule: 'transactions', line: 99 }), finding(4)]));
			assert.equal(result.body.newCount, 0);
			assert.equal(result.body.resolvedCount, 1);
			assert.equal(result.body.openCount, 2);
		});

		it('la lista de repos trae el repo', async () => {
			const result = await call('GET', '/api/history/repos');
			assert.equal(result.body.length, 1);
			assert.deepEqual({ name: result.body[0].name, remoteUrl: result.body[0].remoteUrl }, REPO);
			repoId = result.body[0].id;
		});

		it('el ciclo abierto resume detectados, corregidos y sin corregir', async () => {
			const result = await call('GET', `/api/history/cycles?repoId=${repoId}&state=open`);
			assert.equal(result.body.total, 1);
			const cycle = result.body.items[0];
			assert.equal(cycle.branch, 'prueba');
			assert.equal(cycle.state, 'open');
			assert.equal(cycle.pullRequestId, null);
			assert.equal(cycle.commitCount, 3);
			assert.equal(cycle.detected, 4);
			assert.equal(cycle.resolved, 2);
			assert.equal(cycle.unresolved, 2);
			assert.deepEqual(cycle.detectedBySeverity, { Alta: 1, Media: 3, Baja: 0 });
		});

		it('los commits del ciclo salen en orden con sus cuentas', async () => {
			const result = await call('GET', `/api/history/cycles/commits?repoId=${repoId}&branch=prueba`);
			assert.deepEqual(result.body.map((commit: any) => commit.commitHash), [commitHash(1), commitHash(2), commitHash(3)]);
			assert.deepEqual(result.body.map((commit: any) => commit.newCount), [3, 1, 0]);
			assert.deepEqual(result.body.map((commit: any) => commit.resolvedCount), [0, 1, 1]);
			assert.deepEqual(result.body.map((commit: any) => commit.open.Alta + commit.open.Media + commit.open.Baja), [3, 3, 2]);
			assert.equal(result.body[1].subject, 'ABCD:Commit 2');
			assert.equal(result.body[1].authorName, 'Pau1824');
		});

		it('los hallazgos de un commit traen su estado: nuevo, persiste o resuelto', async () => {
			const commits = (await call('GET', `/api/history/cycles/commits?repoId=${repoId}&branch=prueba`)).body;

			const atFirst = (await call('GET', `/api/history/analyses/${commits[0].analysisId}/findings`)).body;
			assert.deepEqual(atFirst.map((item: any) => item.status), ['new', 'new', 'new']);
			assert.equal(atFirst[0].severity, 'Alta', 'primero la prioridad mas alta');

			const atSecond = (await call('GET', `/api/history/analyses/${commits[1].analysisId}/findings`)).body;
			const byFile = Object.fromEntries(atSecond.map((item: any) => [item.file, item]));
			assert.equal(atSecond.length, 4);
			assert.equal(byFile['Service1.cs'].status, 'resolved');
			assert.equal(byFile['Service2.cs'].status, 'persisting');
			assert.equal(byFile['Service3.cs'].status, 'persisting');
			assert.equal(byFile['Service3.cs'].line, 99, 'muestra la ultima linea en que se vio');
			assert.equal(byFile['Service4.cs'].status, 'new');
		});
	});

	describe('cierre del PR y rama reutilizada', () => {
		let pullRequestId = 0;

		it('avisar el merge cierra el ciclo con sus cuentas', async () => {
			const result = await call('POST', '/api/pull-requests/merged', { repo: REPO, branch: 'prueba', lastCommit: commitHash(3), mergedAt: new Date().toISOString() });
			assert.equal(result.status, 201);
			assert.equal(result.body.detected, 4);
			assert.equal(result.body.resolved, 2);
			assert.equal(result.body.unresolved, 2);
			pullRequestId = result.body.pullRequestId;
			assert.ok(pullRequestId > 0);
		});

		it('el mismo aviso otra vez es un duplicado', async () => {
			const result = await call('POST', '/api/pull-requests/merged', { repo: REPO, branch: 'prueba', lastCommit: commitHash(3) });
			assert.equal(result.status, 200);
			assert.equal(result.body.duplicate, true);
			assert.equal(result.body.pullRequestId, pullRequestId);
		});

		it('despues del merge ya no hay ciclo abierto y el PR aparece como mergeado', async () => {
			assert.equal((await call('GET', `/api/history/cycles?repoId=${repoId}&state=open`)).body.total, 0);
			const merged = (await call('GET', `/api/history/cycles?repoId=${repoId}&state=merged`)).body;
			assert.equal(merged.total, 1);
			assert.equal(merged.items[0].state, 'merged');
			assert.equal(merged.items[0].pullRequestId, pullRequestId);
			assert.ok(merged.items[0].mergedAt);
			assert.equal(merged.items[0].unresolved, 2);
		});

		it('los commits del PR cerrado se consultan con su pullRequestId', async () => {
			const result = await call('GET', `/api/history/cycles/commits?repoId=${repoId}&branch=prueba&pullRequestId=${pullRequestId}`);
			assert.equal(result.body.length, 3);
			assert.equal((await call('GET', `/api/history/cycles/commits?repoId=${repoId}&branch=prueba`)).body.length, 0, 'el ciclo abierto ya esta vacio');
		});

		it('la misma rama se puede reutilizar: empieza un ciclo nuevo sin arrastrar lo del PR anterior', async () => {
			const result = await call('POST', '/api/analyses', analysis(4, [finding(5)]));
			assert.equal(result.body.newCount, 1);
			assert.equal(result.body.resolvedCount, 0, 'los hallazgos sin corregir del PR anterior no se resuelven aqui');
			assert.equal(result.body.openCount, 1);

			const open = (await call('GET', `/api/history/cycles?repoId=${repoId}&state=open`)).body;
			assert.equal(open.total, 1);
			assert.equal(open.items[0].detected, 1);
			const merged = (await call('GET', `/api/history/cycles?repoId=${repoId}&state=merged`)).body;
			assert.equal(merged.items[0].detected, 4, 'el PR cerrado conserva lo suyo');
		});

		it('repetir el aviso de merge viejo no cierra el ciclo nuevo', async () => {
			const result = await call('POST', '/api/pull-requests/merged', { repo: REPO, branch: 'prueba', lastCommit: commitHash(3) });
			assert.equal(result.body.duplicate, true);
			assert.equal((await call('GET', `/api/history/cycles?repoId=${repoId}&state=open`)).body.total, 1);
		});

		it('un aviso con un commit que no se registro (como el commit del merge) no cierra el ciclo abierto', async () => {
			const result = await call('POST', '/api/pull-requests/merged', { repo: REPO, branch: 'prueba', lastCommit: commitHash(60) });
			assert.equal(result.status, 200);
			assert.equal(result.body.skipped, true);
			assert.equal((await call('GET', `/api/history/cycles?repoId=${repoId}&state=open`)).body.total, 1, 'el ciclo abierto sigue abierto');
		});

		it('un merge sin nada que cerrar (rama sin analisis o repo desconocido) se omite', async () => {
			const noBranch = await call('POST', '/api/pull-requests/merged', { repo: REPO, branch: 'otra-rama', lastCommit: commitHash(50) });
			assert.equal(noBranch.status, 200);
			assert.equal(noBranch.body.skipped, true);
			const noRepo = await call('POST', '/api/pull-requests/merged', { repo: { name: 'x', remoteUrl: 'https://github.com/x/x' }, branch: 'prueba', lastCommit: commitHash(51) });
			assert.equal(noRepo.body.skipped, true);
		});
	});

	describe('resumen, busqueda y paginacion', () => {
		it('el resumen cuenta abiertos, corregidos, llegados a main y las reglas mas incumplidas', async () => {
			const result = (await call('GET', `/api/history/summary?repoId=${repoId}&days=30`)).body;
			assert.equal(result.open.total, 1, 'solo el hallazgo 5 sigue abierto en un PR abierto');
			assert.equal(result.open.Media, 1);
			assert.equal(result.detected, 5);
			assert.equal(result.resolved, 2);
			assert.equal(result.reachedMain, 2);
			assert.equal(result.commitCount, 4);
			assert.equal(result.cycleCount, 2);
			assert.deepEqual(result.topRules, [{ rule: 'indentation', count: 4 }, { rule: 'transactions', count: 1 }]);
			assert.equal(result.weekly.length, 6);
			const thisWeek = result.weekly[5];
			assert.equal(thisWeek.detected, 5);
			assert.equal(thisWeek.resolved, 2);
			assert.match(thisWeek.weekStart, /^\d{4}-\d{2}-\d{2}$/);
		});

		it('el resumen sin repoId junta todos los repos', async () => {
			const result = (await call('GET', '/api/history/summary')).body;
			assert.equal(result.detected, 5);
		});

		it('la busqueda encuentra por rama, mensaje o autor sin importar mayusculas ni acentos escritos distinto', async () => {
			const bySubject = (await call('GET', `/api/history/cycles?repoId=${repoId}&search=COMMIT%202`)).body;
			assert.equal(bySubject.total, 1, 'el commit 2 es del PR mergeado');
			assert.equal(bySubject.items[0].state, 'merged');
			assert.equal((await call('GET', '/api/history/cycles?search=PAU1824')).body.total, 2);
			assert.equal((await call('GET', '/api/history/cycles?search=prueba')).body.total, 2);
			assert.equal((await call('GET', '/api/history/cycles?search=zzzz')).body.total, 0);
			assert.equal((await call('GET', '/api/history/cycles?search=%25')).body.total, 0, 'un % escrito por el usuario no es comodin');
			assert.equal((await call('GET', `/api/history/cycles?search=${commitHash(4).slice(0, 7)}`)).body.items[0].state, 'open', 'por hash de commit');
		});

		it('la paginacion respeta limit y offset y ordena del mas reciente al mas viejo', async () => {
			const first = (await call('GET', '/api/history/cycles?limit=1&offset=0')).body;
			const second = (await call('GET', '/api/history/cycles?limit=1&offset=1')).body;
			assert.equal(first.total, 2);
			assert.equal(first.items.length, 1);
			assert.equal(first.items[0].state, 'open', 'el ciclo mas reciente va primero');
			assert.equal(second.items[0].state, 'merged');
			assert.equal((await call('GET', '/api/history/cycles?limit=1&offset=2')).body.items.length, 0);
		});
	});

	describe('datos reales: acentos, volumen y concurrencia', () => {
		it('guarda y regresa acentos, eñes y comillas sin dañarlos', async () => {
			const text = 'Función «compleja» con ñ, ü y un símbolo ✓';
			const post = await call('POST', '/api/analyses', analysis(6, [finding(60, { message: text, file: 'Módulo/Señal.cs' })], { branch: 'rama-acentos' }));
			assert.equal(post.status, 201);
			const commits = (await call('GET', `/api/history/cycles/commits?repoId=${repoId}&branch=rama-acentos`)).body;
			const findings = (await call('GET', `/api/history/analyses/${commits[0].analysisId}/findings`)).body;
			assert.equal(findings[0].message, text);
			assert.equal(findings[0].file, 'Módulo/Señal.cs');
		});

		it('guarda 300 hallazgos en un solo commit', async () => {
			const many = Array.from({ length: 300 }, (_unused, index) => finding(1000 + index, { rule: index % 2 === 0 ? 'naming' : 'varUsage', severity: ['Alta', 'Media', 'Baja'][index % 3] }));
			const result = await call('POST', '/api/analyses', analysis(7, many, { branch: 'rama-grande' }));
			assert.equal(result.status, 201);
			assert.equal(result.body.newCount, 300);
			const open = (await call('GET', `/api/history/cycles?repoId=${repoId}&search=rama-grande`)).body.items[0];
			assert.deepEqual(open.detectedBySeverity, { Alta: 100, Media: 100, Baja: 100 });
		});

		it('dos equipos mandando el mismo commit a la vez: uno lo guarda y el otro lo toma como duplicado', async () => {
			const payload = analysis(8, [finding(80)], { branch: 'rama-concurrente' });
			const results = await Promise.all([call('POST', '/api/analyses', payload), call('POST', '/api/analyses', payload)]);
			assert.deepEqual(results.map(result => result.status).sort(), [200, 201]);
			const commits = (await call('GET', `/api/history/cycles/commits?repoId=${repoId}&branch=rama-concurrente`)).body;
			assert.equal(commits.length, 1);
			assert.equal(commits[0].open.Media, 1, 'los hallazgos tampoco se duplican');
		});

		it('un aviso de merge tardio cierra solo hasta su commit y los hallazgos que "se resolvieron" por empezar otro ciclo siguen abiertos', async () => {
			const branch = 'rama-tardia';
			await call('POST', '/api/analyses', analysis(10, [finding(100)], { branch }));
			await call('POST', '/api/analyses', analysis(11, [finding(100), finding(101)], { branch }));
			//el siguiente commit ya es de otro ciclo (el PR se mergeo) pero su aviso todavia no llega
			const next = await call('POST', '/api/analyses', analysis(12, [finding(102)], { branch }));
			assert.equal(next.body.resolvedCount, 2, 'visto solo, parece que corrigio los dos anteriores');

			const closed = await call('POST', '/api/pull-requests/merged', { repo: REPO, branch, lastCommit: commitHash(11) });
			assert.equal(closed.status, 201);
			assert.equal(closed.body.detected, 2);
			assert.equal(closed.body.resolved, 0, 'al momento del merge los dos seguian abiertos');
			assert.equal(closed.body.unresolved, 2);

			const merged = (await call('GET', `/api/history/cycles?repoId=${repoId}&state=merged&search=${branch}`)).body.items[0];
			assert.equal(merged.commitCount, 2);
			assert.equal(merged.unresolved, 2);
			const open = (await call('GET', `/api/history/cycles?repoId=${repoId}&state=open&search=${branch}`)).body.items[0];
			assert.equal(open.commitCount, 1, 'el commit 12 queda en el ciclo nuevo');
			assert.equal(open.detected, 1);
		});

		it('un hallazgo repetido en el mismo envio se cuenta una sola vez', async () => {
			const result = await call('POST', '/api/analyses', analysis(9, [finding(90), finding(90)], { branch: 'rama-repetida' }));
			assert.equal(result.body.openCount, 1);
		});
	});
});
