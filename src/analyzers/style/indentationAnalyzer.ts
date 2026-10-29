// -------------------------------------------------------------------------------
// ---- VERIFICACION DE IDENTACION -------------------------------------------------
// -------------------------------------------------------------------------------

const BAKEND_TAB_SIZE = 4; //Se considera que el tamaño de tabulacion es de 4 espacios
const FRONTEND_TAB_SIZE = 2;
const FRONTEND_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx'];

// Funcion para contar el numero de espacios en una cadena de texto, considerando el tabulador
function countWidth(indent: string, tabSize: number): number {
	let ancho = 0;
	for (const char of indent) { // Se corre cada caracter de la cadena de texto
		ancho += (char === '\t') ? tabSize : 1; // Si el caracter es un tabulador se suma el tamaño de tabulacion, si no se suma 1
	}
	return ancho;
}

function getExtension(fileLabel: string): string {
	return fileLabel.split('.').pop()?.toLowerCase() ?? '';
}

// Revisa la identacion de un archivo y agrega los hallazgos al arreglo de resultados
export function analyzeIndentation(lines: string[], fileLabel: string, findings: string[], changedLines: Set<number>): void {
	const tabSize = FRONTEND_EXTENSIONS.includes(getExtension(fileLabel)) ? FRONTEND_TAB_SIZE : BAKEND_TAB_SIZE;
	let indentationPrevious = '';

	// Se recorre cada linea del documento y se verifica la identacion
	lines.forEach((line, i) => {
		if (line.trim() === '') { // Si la linea esta vacia no se hace nada
			return;
		}

		const indentMatch = line.match(/^[ \t]*/)?.[0] ?? '';  // Se obtiene la identacion de la linea actual
		const currentWide = countWidth(indentMatch, tabSize); // Se obtiene el ancho de la identacion
		const previousWide = countWidth(indentationPrevious, tabSize); // Se obtiene el ancho de la identacion de la linea anterior

		if (changedLines.has(i + 1)) {
			const newPart = currentWide > previousWide ? indentMatch.slice(indentationPrevious.length) : indentMatch;

			if (newPart.includes(' ')) {
				findings.push(fileLabel + ':' + (i + 1) + ' - La linea debio usar tabulaciones en lugar de espacios para la identacion');
			}
		}

		indentationPrevious = indentMatch; // Se guarda la identacion actual para comprar con la siguiente linea
	});
}
