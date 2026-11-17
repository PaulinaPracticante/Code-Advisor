import { createConnection, createPool as createMysqlPool, Pool } from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import { DbConfig } from './config';

const SCHEMA_FILE = path.join(__dirname, '..', 'sql', '001_create_history.sql');

//las fechas se guardan y se leen en UTC para que no dependan de la zona horaria del servidor
export function createPool(config: DbConfig): Pool {
	return createMysqlPool({
		host: config.host,
		port: config.port,
		user: config.user,
		password: config.password,
		database: config.database,
		waitForConnections: true,
		connectionLimit: 10,
		charset: 'utf8mb4',
		timezone: 'Z',
	});
}

//crea la base de datos si no existe y le aplica el script de tablas y vistas (sql/001_create_history.sql)
export async function initDatabase(config: DbConfig): Promise<void> {
	const connection = await createConnection({
		host: config.host,
		port: config.port,
		user: config.user,
		password: config.password,
		multipleStatements: true,
		charset: 'utf8mb4',
	});

	try {
		await connection.query(
			`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
		);
		await connection.query(`USE \`${config.database}\``);
		await connection.query(fs.readFileSync(SCHEMA_FILE, 'utf8'));
	} finally {
		await connection.end();
	}
}
