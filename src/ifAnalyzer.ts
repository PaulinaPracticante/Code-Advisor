// -------------------------------------------------------------------------------
// ---- VERIFICACION DE "IF": LLAVES OBLIGATORIAS Y TERNARIOS SIN ANIDAR ----------
// -------------------------------------------------------------------------------

//Corta cualquier comentario de la linea, igual que en los demas analyzers
function stripLineComment(rawLine: string): string {
	const commentIndex = rawLine.indexOf('//');
	return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

//Encuentra el indice del parentesis que cierra el que abre en openIndex, contando profundidad
//para soportar condiciones con parentesis anidados (ej. if (foo(x) > 0)). Regresa -1 si la
//condicion no cierra en esta misma linea
function findMatchingParenClose(text: string, openIndex: number): number {
	let depth = 0;
	for (let i = openIndex; i < text.length; i++) {
		if (text[i] === '(') {
			depth++;
		} else if (text[i] === ')') {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}
	return -1;
}

//Revisa si el cuerpo de un if/else usa llaves. 
function checkBraceUsage(bodyOnSameLine: string, keywordLineIndex: number, lines: string[], label: string, fileLabel: string, findings: string[]): void {
	if (bodyOnSameLine !== '') { //Si no esta vacio bodyOnSameLine (la linea despues del if o else)
		if (!bodyOnSameLine.startsWith('{')) { //si lo que hay en la linea no es un { significa que hay un hallazgo
			findings.push(fileLabel + ':' + (keywordLineIndex + 1) + ' - El ' + label + ' de una sola instruccion debe usar llaves {}');
		}
		return;
	}

	for (let j = keywordLineIndex + 1; j < lines.length; j++) {
		const nextTrimmed = stripLineComment(lines[j]).trim();
		if (nextTrimmed === '') { //Si esta vacio el if/else 
			continue; //se ignoran lineas vacias hasta encontrar el cuerpo
		}
		if (!nextTrimmed.startsWith('{')) { //si la siguiente linea no vacia tampoco empieza con { es un hallazgo
			findings.push(fileLabel + ':' + (keywordLineIndex + 1) + ' - El ' + label + ' de una sola instruccion debe usar llaves {}');
		}
		break;
	}
}

//Cuenta los operadores "?" que son ternarios en una linea, descartando "?." (optional chaining)
//y "??" (nullish coalescing).
function countTernaryOperators(trimmedLine: string): number {
	return (trimmedLine.match(/(?<!\?)\?(?!\.|\?)/g) ?? []).length;
}

//Una linea "continua" el ternario de la linea anterior si empieza con "?" o ":".
function isTernaryContinuation(trimmedLine: string): boolean {
	return /^\?(?!\.|\?)/.test(trimmedLine) || trimmedLine.startsWith(':');
}

//detecta si el texto es una sentencia LINQ: lambda ("=>") o query syntax ("from x in ...")
const LINQ_LAMBDA_PATTERN = /=>/;
const LINQ_QUERY_PATTERN = /^from\s+\w+\s+in\b/;

// Divide el texto en "segmentos" independientes: cada lambda ("=>") o cada clausula de
// query syntax (from/where/select/orderby/group/join/let) es su propio alcance. Un ternario
// en un segmento no cuenta como anidado con el de otro segmento, porque viven en expresiones
// distintas (ej. dos .Select() separados en la misma cadena LINQ).
function splitIntoExpressionSegments(text: string): string[] {
	if (LINQ_QUERY_PATTERN.test(text)) {
		return text.split(/\b(?:from|where|select|orderby|grouo|join|let)\b/);
	}
	if (LINQ_LAMBDA_PATTERN.test(text)) {
		return text.split('=>');
	}
	return [text];
}

// Revisa ternarios anidados, incluyendo los escritos en varias lineas. Junta la linea donde aparece
// el primer "?" con las siguientes lineas de continuacion, pero en vez de sumar TODOS los "?" de la
// cadena, cuenta por segmento independiente (separando por "=>" o por clausulas LINQ), para no marcar
// como anidados ternarios que en realidad son independientes dentro de una sentencia LINQ.
function checkNestedTernaries(lines: string[], fileLabel: string, findings: string[]): void {
	let i = 0;
	//Si la linea i no tiene ningun ? avanza una linea y sigue  
	while (i < lines.length) {
		const trimmed = stripLineComment(lines[i]).trim();
		let totalTernaryCount = countTernaryOperators(trimmed);

		if (countTernaryOperators(trimmed)) {
			i++;
			continue;
		}

		//si si tiene ? va juntando todas las lineas siguientes que sean con continuacion, sumando sus operadores ternarios a totalTernaryCount.
		let chainText = trimmed;
		let j = i + 1;
		while (j < lines.length) {
			const nextTrimmed = stripLineComment(lines[j]).trim();
			if (!isTernaryContinuation(nextTrimmed)) {
				break;
			}
			chainText += ' ' + nextTrimmed;
			j++;
		}

		const segments = splitIntoExpressionSegments(chainText);
		const hasRealNesting = segments.some(segment => countTernaryOperators(segment) >= 2);

		// si al final esa cadenas junta 2 o mas ?, es un ternario anidado, osea que es un hallazgo 
		if (hasRealNesting) {
			findings.push(fileLabel + ':' + (i + 1) + ' - Se encontraron operadores ternarios anidados, evita anidar "?:"');
		}

		i = j; //se salta las lineas de la cadena ya revisada
	}
}

// Revisa que los if/else if/else de una sola instruccion usen llaves, y que no haya
// operadores ternarios anidados.
export function analyzeIfStatements(lines: string[], fileLabel: string, findings: string[]): void {
	lines.forEach((rawLine, i) => {
		const line = stripLineComment(rawLine);
		const trimmed = line.trim();

		// El "else" puede venir despues de un "}" en la misma linea (estilo "} else {")
		const elseCandidate = trimmed.startsWith('}') ? trimmed.replace(/^\}\s*/, '') : trimmed;

		const ifMatch = trimmed.match(/^if\s*\(/);
		const elseIfMatch = elseCandidate.match(/^else\s+if\s*\(/);

		if (ifMatch || elseIfMatch) {
			const source = ifMatch ? trimmed : elseCandidate;
			const label = ifMatch ? 'if' : 'else if';
			const openIndex = (ifMatch ? ifMatch[0] : elseIfMatch![0]).length - 1;
			const closeIndex = findMatchingParenClose(source, openIndex);

			if (closeIndex !== -1) { //si la condicion no cierra en la misma linea, no se puede verificar y se ignora
				const bodyOnSameLine = source.slice(closeIndex + 1).trim();
				checkBraceUsage(bodyOnSameLine, i, lines, label, fileLabel, findings);
			}
		} else if (/^else\b/.test(elseCandidate)) { //else "suelto", sin el if
			const bodyOnSameLine = elseCandidate.slice('else'.length).trim();
			checkBraceUsage(bodyOnSameLine, i, lines, 'else', fileLabel, findings);
		}
	});

	checkNestedTernaries(lines, fileLabel, findings);
}
