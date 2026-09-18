// -------------------------------------------------------------------------------
// ---- VERIFICACION DE NOMBRES (CLASES, FUNCIONES, METODOS, VARIABLES, ETC.) -----
// -------------------------------------------------------------------------------

import { CaseStyle, LANGUAGE_NAMING_CONFIGS, LanguageNamingConfig, matchesCase } from './namingConfig';

function matchFirstGroup(text: string, patterns: RegExp[]): string | null {
	for (const pattern of patterns) { //prueba cada regex en orden
		const match = text.match(pattern); //si uno matchea regresa el regex el primero que haga match
		if (match) {
			return match[1];
		}
	}
	return null; // si ni uno matchea regresa null
}

//tipo de dato que agrupa los 5 arreglo de nombres encontrados en el documento
interface ExtractedNames {
	classNames: string[];
	functionNames: string[];
	methodNames: string[];
	variableNames: string[];
	constantNames: string[];
}

// Recorre el documento llevando la profundidad de llaves para saber si una linea
// esta dentro del cuerpo de una clase (y por lo tanto es un metodo y no una funcion suelta)
function extractNamesByCategory(lines: string[], config: LanguageNamingConfig): ExtractedNames {
	const classNames: string[] = [];
	const functionNames: string[] = [];
	const methodNames: string[] = [];
	const variableNames: string[] = [];
	const constantNames: string[] = [];

	let braceDepth = 0; // contador de profundidad de llaves
	const classOuterDepths: number[] = []; //array con la profundidad en la que vive cada clase abierta
	// Profundidad en la que se declaro una clase que aun no abre su "{" (puede venir en una linea posterior, estilo Allman/C#)
	let pendingClassOuterDepth: number | null = null;

	for (const rawLine of lines) {
		//Corta cualquier comentario para que se confunda con las palabras
		const commentIndex = rawLine.indexOf('//');
		const line = commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
		const trimmed = line.trim();

		//esto cierra cualquier clase cuya llave de cierre ya se haya alcanzado
		//si braceDepth volvio a ser igual o menor a la profundidad donde se abro la clase entoces ya salimos de ella
		while (classOuterDepths.length > 0 && braceDepth <= classOuterDepths[classOuterDepths.length - 1]) {
			classOuterDepths.pop();
		}
		const insideClass = classOuterDepths.length > 0;

		//prueba los regex de clase y si matchea guarda el nombre
		const classMatch = matchFirstGroup(trimmed, config.classPatterns);
		if (classMatch) {
			classNames.push(classMatch);
		}

		//si estamos dentro de una clase se prueba el patron de metodo para descartar falsos positivos
		//como las palabras claves que estan methodNameBlacklist o nombres exigidos por el lenguaje
		//ej. if o __construct
		if (insideClass) {
			const methodMatch = matchFirstGroup(trimmed, config.methodPatterns);
			if (methodMatch && !config.methodNameBlacklist?.has(methodMatch) && !config.methodNameExempt?.test(methodMatch)) {
				methodNames.push(methodMatch);
			}
		} else { //si no estamos dentro de una clase se prueba el patron de funcion suelta
			const functionMatch = matchFirstGroup(trimmed, config.functionPatterns);
			if (functionMatch) {
				functionNames.push(functionMatch);
			}
		}

		//prueba los regex de variables y si matchea guarda el nombre
		const variableMatch = matchFirstGroup(trimmed, config.variablePatterns);
		if (variableMatch) {
			variableNames.push(variableMatch);
		}

		//prueba los regex de constantes y si matchea guarda el nombre
		const constantMatch = matchFirstGroup(trimmed, config.constantPatterns);
		if (constantMatch) {
			constantNames.push(constantMatch);
		}

		//si se detecto una clase en esta linea se guarda la profundidas actual como pendiente
		if (classMatch) {
			pendingClassOuterDepth = braceDepth;
		}

		const opens = (line.match(/\{/g) ?? []).length; //se cuentan las llaves que que se abren en una linea
		const closes = (line.match(/\}/g) ?? []).length; //se cuentan las llaves que se cierran en una linea
		braceDepth += opens - closes; // se actualiza

		//si habia una clase pendiente y en esta linea si se abrio al menos una llave
		if (pendingClassOuterDepth !== null && opens > 0) {
			classOuterDepths.push(pendingClassOuterDepth); //se empuja la profundidad a classOuterDepths
			pendingClassOuterDepth = null;
		}
	}

	return { classNames, functionNames, methodNames, variableNames, constantNames };
}

//Si un nombre no cumple con CaseStyle agrega el hallazgo al arreglo de resultados del archivo
function reportInvalidNames(names: string[], caseStyle: CaseStyle, label: string, fileLabel: string, findings: string[]): void {
	names.forEach(name => { //recorre un arreglo de nombres ya extraido
		if (!matchesCase(name, caseStyle)) { //si no cumple con CaseStyle agrega el hallazgo
			findings.push(fileLabel + ' - ' + label + ' ' + name + ' no usa ' + caseStyle);
		}
	});
}

// Revisa clases, funciones, metodos, variables y constantes de un archivo y agrega los hallazgos al arreglo de resultados
export function analyzeNaming(lines: string[], languageId: string, fileLabel: string, findings: string[]): void {
	const namingConfig = LANGUAGE_NAMING_CONFIGS[languageId]; //busca la configuracion que le corresponde en LANGUAGE_NAMING_CONFIGS

	if (!namingConfig) { //si no hay config para ese lenguaje se ignora el archivo
		return;
	}

	//llama a extractNamesByCategory para sacar los 5 arreglos de nombres
	const { classNames, functionNames, methodNames, variableNames, constantNames } = extractNamesByCategory(lines, namingConfig);

	//se llama a esta funcion una vez por categoria usando el CaseStyle que le corresponde a cada uno
	reportInvalidNames(classNames, namingConfig.classCase, 'La clase', fileLabel, findings);
	reportInvalidNames(functionNames, namingConfig.functionCase, 'La función', fileLabel, findings);
	reportInvalidNames(methodNames, namingConfig.methodCase, 'El método', fileLabel, findings);
	reportInvalidNames(variableNames, namingConfig.variableCase, 'La variable', fileLabel, findings);
	reportInvalidNames(constantNames, namingConfig.constantCase, 'La constante', fileLabel, findings);
}
