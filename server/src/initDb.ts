//crea la base de datos y sus tablas con los datos de .env (otra forma es correr sql/001_create_history.sql en MySQL Workbench)
import { loadConfig } from './config';
import { initDatabase } from './db';

initDatabase(loadConfig().db)
	.then(() => console.log('Base de datos lista'))
	.catch(error => {
		console.error('No se pudo preparar la base de datos:', error);
		process.exit(1);
	});
