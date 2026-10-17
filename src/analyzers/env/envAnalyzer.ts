// -------------------------------------------------------------------------------
// ---- VERIFICACION DE VARIABLES DE ENTORNO ---------------------------------------
// -------------------------------------------------------------------------------

// Revisa el nombre de las variables de entorno de un archivo .env y agrega los hallazgos al arreglo de resultados
export function analyzeEnvVariables(lines: string[], fileLabel: string, findings: string[]): void {
	const variables: string[] = [];

	// Recorre cada linea del documento y se obtienen el nombre de las variables de entorno
	lines.forEach(line => {
		const trimmed = line.trim(); // Se eliminan los espacios en blanco al inicio y al final
		if (trimmed === '' || trimmed.startsWith('#')) {
			return; //Ignorar lineas vacias y comentarios
		}

		const variableName = trimmed.split('=')[0].trim(); // Se obtiene el nombre de la variable de entorno antes del =
		variables.push(variableName); // Se agregar el nombre de la variable de entorno al arreglo
	});

	// Se recorre el arreglo y verifica si cumple con UPPER_SNAKE_CASE
	variables.forEach(name => {
		const isUpperCase = /^[A-Z][A-Z0-9_]*$/.test(name); // Se verifica si el nombre de la variable es UPPER_SNAKE_CASE
		if (!isUpperCase) {
			findings.push(fileLabel + ' - La variable ' + name + ' no usa UPPER_SNAKE_CASE');
		}
	});
}
