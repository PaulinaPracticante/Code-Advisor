import { createApp } from './app';
import { loadConfig } from './config';
import { createPool } from './db';

const config = loadConfig();
const pool = createPool(config.db);
const app = createApp(pool, { apiToken: config.apiToken });

app.listen(config.port, () => {
	console.log(`API del historial escuchando en http://localhost:${config.port} (token ${config.apiToken ? 'activado' : 'sin activar'})`);
});

//al apagar el proceso se cierran las conexiones a MySQL
process.on('SIGINT', () => { void pool.end().then(() => process.exit(0)); });
process.on('SIGTERM', () => { void pool.end().then(() => process.exit(0)); });
