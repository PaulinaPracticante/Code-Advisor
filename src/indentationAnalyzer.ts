// -------------------------------------------------------------------------------
// ---- VERIFICACION DE IDENTACION -------------------------------------------------
// -------------------------------------------------------------------------------

const TAB_SIZE = 4; //Se considera que el tamaño de tabulacion es de 4 espacios

// Funcion para contar el numero de espacios en una cadena de texto, considerando el tabulador
function countSpaces(indent: string): number {
	let ancho = 0;
	for (const char of indent) { // Se corre cada caracter de la cadena de texto
		ancho += (char === '\t') ? TAB_SIZE : 1; // Si el caracter es un tabulador se suma el tamaño de tabulacion, si no se suma 1
	}
	return ancho;
}

// Revisa la identacion de un archivo y agrega los hallazgos al arreglo de resultados
export function analyzeIndentation(lines: string[], fileLabel: string, findings: string[]): void {
	let indentationPrevious = '';

	// Se recorre cada linea del documento y se verifica la identacion
	lines.forEach((line, i) => {
		if (line.trim() === '') { // Si la linea esta vacia no se hace nada
			return;
		}

		const indentMatch = line.match(/^[ \t]*/)?.[0] ?? '';  // Se obtiene la identacion de la linea actual
		const currentWide = countSpaces(indentMatch); // Se obtiene el ancho de la identacion
		const previousWide = countSpaces(indentationPrevious); // Se obtiene el ancho de la identacion de la linea anterior

		// Se verifica si la identacion de la linea actual es mayor a la anterior
		if (currentWide > previousWide) {
			const newPart = indentMatch.slice(indentationPrevious.length);

			// Se verifica si la identacion de la linea actual tiene espacios
			if (newPart.includes(' ')) {
				findings.push(fileLabel + ':' + (i + 1) + ' - La linea debio usar tabulaciones en lugar de espacios para la identacion');
			}
		} else {
			if (indentMatch.includes(' ')) {
				findings.push(fileLabel + ':' + (i + 1) + ' - La linea debio usar tabulaciones en lugar de espacios para la identacion');
			}
		}

		indentationPrevious = indentMatch; // Se guarda la identacion actual para comprar con la siguiente linea
	});
}
