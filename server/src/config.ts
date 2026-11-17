//configuracion de la API, sale de las variables de entorno (ver env.example)
export interface DbConfig {
	host: string;
	port: number;
	user: string;
	password: string;
	database: string;
}

export interface AppConfig {
	port: number;
	apiToken: string; //vacio = la API no pide nada
	db: DbConfig;
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
	const value = env[name];
	if (value === undefined || value === '') {
		throw new Error(`Falta la variable de entorno ${name} (revisa tu archivo .env, hay un ejemplo en env.example)`);
	}
	return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
	return {
		port: Number.parseInt(env.API_PORT ?? '3000', 10),
		apiToken: env.API_TOKEN ?? '',
		db: {
			host: requireEnv(env, 'DB_HOST'),
			port: Number.parseInt(env.DB_PORT ?? '3306', 10),
			user: requireEnv(env, 'DB_USER'),
			password: env.DB_PASSWORD ?? '',
			database: requireEnv(env, 'DB_NAME'),
		},
	};
}
