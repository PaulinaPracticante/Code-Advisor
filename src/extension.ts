import * as vscode from 'vscode';

// -------------------------------------------------------------------------------
// ---- VERIFICACION DE NOMBRES (CLASES, FUNCIONES, METODOS, VARIABLES, ETC.) -----
// -------------------------------------------------------------------------------

//Tipo con los estilos que se deben de reconocer 
type CaseStyle = 'PascalCase' | 'camelCase' | 'UPPER_SNAKE_CASE'; 

//Funcion que determina si el nombre si cumple con el estilo esperado
function matchesCase(name: string, caseStyle: CaseStyle): boolean {
	switch (caseStyle) {
		case 'PascalCase':
			// Debe iniciar en mayuscula y tener al menos una minuscula (si no, es como UPPER_CASE)
			return /^[A-Z][a-zA-Z0-9]*$/.test(name) && /[a-z]/.test(name);
		case 'camelCase':
			//Empieza con minuscula y el resto puede ser letras o numeros 
			return /^[a-z][a-zA-Z0-9]*$/.test(name);
		case 'UPPER_SNAKE_CASE':
			//Todo debe de ser mayuscula y el resto mayuscula, numeros o guion bajo
			return /^[A-Z][A-Z0-9_]*$/.test(name);
	}
}

//interfaz para describir como se debe de ver el codigo valido 
//CaseStyle es para los estilos de nombre
//RegExp regex para encontrar declaraciones dentro de la linea del codigo
interface LanguageNamingConfig {
	classCase: CaseStyle;
	functionCase: CaseStyle;
	methodCase: CaseStyle;
	variableCase: CaseStyle;
	constantCase: CaseStyle;
	classPatterns: RegExp[];
	functionPatterns: RegExp[]; // Funciones fuera de una clase (vacio si el lenguaje no las tiene, p. ej. C#)
	methodPatterns: RegExp[]; // Funciones/metodos dentro de una clase
	variablePatterns: RegExp[];
	constantPatterns: RegExp[];
	methodNameBlacklist?: Set<string>; // Para descartar falsos positivos con palabras clave (if, for, while, etc.)
	methodNameExempt?: RegExp; // Nombres de metodo exigidos por el propio lenguaje (p. ej. metodos magicos de PHP), no por el desarrollador
}

//lista de palabras clave para que lo considere en methodNameBlacklist
const CONTROL_FLOW_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'do', 'try', 'finally', 'foreach', 'using', 'lock']);

//Configuracion para JavaScript y Typescript 
const JS_TS_NAMING_CONFIG: LanguageNamingConfig = {
	//Estilo de nombres 
	classCase: 'PascalCase',
	functionCase: 'camelCase',
	methodCase: 'camelCase',
	variableCase: 'camelCase',
	constantCase: 'camelCase',
	//Busca la palabra class y descarta export, default y abstract, y captura el nombre 
	classPatterns: [
		/^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
	],
	//Busca function y descarta export, default y async, y captura el nombre
	functionPatterns: [
		/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
	],
	//Busca un nombre seguido de (argumentos) y luego { o ;
	methodPatterns: [
		/^(?:(?:public|private|protected|static|readonly|abstract|override|async)\s+)*(?:get\s+|set\s+)?\*?\s*([A-Za-z_$#][A-Za-z0-9_$]*)\s*\([^()]*\)\s*(?::\s*[^{;]+)?[{;]/,
	],
	//Busca el nombre con let o var al inicio de la linea
	variablePatterns: [
		/^(?:export\s+)?(?:let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
	],
	//Busca el nombre con const al inicio de la linea
	constantPatterns: [
		/^(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
	],
	methodNameBlacklist: CONTROL_FLOW_KEYWORDS,
};

//Configuracion para php 
const PHP_NAMING_CONFIG: LanguageNamingConfig = {
	//Estilo para los nombres 
	classCase: 'PascalCase',
	functionCase: 'camelCase',
	methodCase: 'camelCase',
	variableCase: 'camelCase',
	constantCase: 'camelCase',
	//Busca el nombre con posible abstract o final antes 
	classPatterns: [
		/^(?:abstract\s+|final\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/,
	],
	functionPatterns: [
		/^function\s*&?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
	],
	methodPatterns: [
		/^(?:(?:public|private|protected|static|abstract|final)\s+)*function\s*&?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
	],
	variablePatterns: [
		// Asignacion simple: $nombre = valor;
		/^\$([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/,
		// Propiedad de clase, con modificadores y/o tipo opcionales: private ?string $nombre = valor;
		// El tipo solo puede ser un primitivo conocido o un identificador con mayuscula inicial (nombre de clase),
		// para no confundir palabras como "return"/"if"/"echo" con un tipo. Debe terminar en ";", "," o "=" y no en
		// "->" para no capturar usos como $this->nombre o $obj->metodo().
		/^(?:(?:public|private|protected|static|readonly)\s+)*(?:\??(?:int|float|string|bool|array|object|callable|iterable|mixed|void|never|self|static|parent|[A-Z][A-Za-z0-9_\\]*)\s+)?\$([A-Za-z_][A-Za-z0-9_]*)\s*(?:[;,]|=(?!=))/,
	],
	//Busca el nombre ante las dos formas de declarar constantes en php con const o con define
	constantPatterns: [
		/^(?:(?:public|private|protected)\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/,
		/^define\s*\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/,
	],
	// PHP obliga estos nombres exactos para los metodos magicos; no son una eleccion de estilo del desarrollador
	methodNameExempt: /^__[A-Za-z]/,
};

//Strin reutilizable con modificadores de acce que se insertan en el regex usando newRegExp
const CSHARP_MODIFIERS = '(?:public|private|protected|internal|static|virtual|override|async|abstract|sealed|new|extern)';

// Configuracion para c#
const CSHARP_NAMING_CONFIG: LanguageNamingConfig = {
	//Estilo para los nombres
	classCase: 'PascalCase',
	functionCase: 'camelCase', 
	methodCase: 'camelCase',
	variableCase: 'camelCase',
	constantCase: 'camelCase',
	//Buscan el nombre con class antes 
	classPatterns: [
		/^(?:(?:public|private|protected|internal|static|abstract|sealed|partial)\s+)*class\s+([A-Za-z_][A-Za-z0-9_]*)/,
	],
	//vacio porque c# no tiene funciones fuera de una clase, todo es metodo 
	functionPatterns: [],
	//Exige el menos un modificador de acceso, luego un tipo de retorno, luego el nombre y (parametros)
	methodPatterns: [
		new RegExp(`^(?:${CSHARP_MODIFIERS}\\s+)+[\\w<>\\[\\],.?]+\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\([^()]*\\)\\s*(?:\\{|;|=>|$)`),
	],
	//Busca el nombre con un tipo antes
	variablePatterns: [
		/^(?:var|int|string|bool|double|float|long|short|byte|char|decimal|object|dynamic|uint|ulong|ushort|sbyte)\s+([A-Za-z_][A-Za-z0-9_]*)\s*[=;]/,
	],
	//Buscan el nombre con const y modificadores opcionales antes 
	constantPatterns: [
		/^(?:(?:public|private|protected|internal|static|readonly)\s+)*const\s+[\w<>\[\],.?]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/,
	],
	methodNameBlacklist: CONTROL_FLOW_KEYWORDS,
};

//Diccionario que conecta el lenguajeId y asigna vscode a cada documento con la configuracion que le corresponde 
const LANGUAGE_NAMING_CONFIGS: Record<string, LanguageNamingConfig> = {
	javascript: JS_TS_NAMING_CONFIG,
	javascriptreact: JS_TS_NAMING_CONFIG,
	typescript: JS_TS_NAMING_CONFIG,
	typescriptreact: JS_TS_NAMING_CONFIG,
	php: PHP_NAMING_CONFIG,
	csharp: CSHARP_NAMING_CONFIG,
};

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

//Si un nombre o cumple con CaseStyle muestra un mensaje 
function reportInvalidNames(names: string[], caseStyle: CaseStyle, label: string): void {
	names.forEach(name => { //recorre un arreglo de nombres ya extraido 
		if (!matchesCase(name, caseStyle)) { //si no cumple con CaseStyle muestra el mensaje de error 
			vscode.window.showErrorMessage(label + ' ' + name + ' no usa ' + caseStyle);
		}
	});
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "codeadvisor" is now active!');

	// comando para verificar el repo de git
	const disposable = vscode.commands.registerCommand('codeadvisor.gitVerification', () => {
		// Todo lo que pasa aqui se ejecutara cuando se ejecute el comando helloworld 
		const folder = vscode.workspace.workspaceFolders?.[0]; // Se checa si hay una carpeta abierta en el workspace 

		if (!folder) { //Si no hay una carpeta abierta, se muestra un mensaje de error 
			vscode.window.showErrorMessage('Abra una carpeta que sea un repositorio de git primero');
		}

		const folderPath = folder?.uri.fsPath; //Se obtiene la ruta de la carpeta abierta en el workspace 
		const git = vscode.extensions.getExtension('vscode.git')?.exports.getAPI(1); // Se obtiene la API de git de la extension de git de vscode 
		const repo = folderPath ? git?.getRepository(vscode.Uri.file(folderPath)) : undefined;  // Se obtiene el repositorio de git de la carpeta abierta en el workspace 

		if (!repo) { //Si no se encuenta un repositorio de git en esta carpeta, se muestra el mensaje de error 
			vscode.window.showErrorMessage('No se pudo encontrar un repositorio de git en la carpeta abierta');
		}

	});

    // Comando para revisar el codigo del documento 
	const disposable2 = vscode.commands.registerCommand('codeadvisor.codeReviwer', () => {

		// -------------------------------------------------------------------------------
		// -------------------------------------------------------------------------------
		// ----IDENTACION-----------------------------------------------------------------
		// -------------------------------------------------------------------------------
		// -------------------------------------------------------------------------------
		const tab_size =  4; //Se considera que el tamaño de tabulacion es de 4 espacios

		// Funcion para contar el numero de espacios en una cadena de texto, consierando el tabulador 
		function countSpaces(indent: string): number {
			let ancho = 0;
			for (const char of indent) { // Se corre cada caracter de la cadena de texto
				ancho += (char === '\t') ? tab_size : 1; // Si el caracter es un tabulador se suma el tamaño de tabulacion, si no se suma 1
			}
			return ancho;
		}

		let indentationPrevious = '';

		const documentText = vscode.window.activeTextEditor?.document.getText() || ''; //Se obtiene el texto del documento actual 
		const lines = documentText.split('\n');// Se divide el texto del documento en lineas 

		// Se recorre cada linea del doumento y se verifica la identacion 
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
					vscode.window.showWarningMessage('La linea ' + (i + 1) + ' debio usar tabulaciones en lugar de espacios para la identacion'); 
				} 
			} else {
				if (indentMatch.includes(' ')){
					vscode.window.showWarningMessage('La linea ' + (i + 1) + ' debio usar tabulaciones en lugar de espacios para la identacion');
				}
			}

			indentationPrevious = indentMatch; // Se guarda la identacion actual para comprar con la siguiente linea 
		});


		//---------------------------------------------------------------------------------------
		//---------------------------------------------------------------------------------------
		//----NOMBRES DE VARIABLES DE ENTORNO, CLASES, FUNCIONES, ETC.---------------------------
		//---------------------------------------------------------------------------------------
		//---------------------------------------------------------------------------------------


		// --------------------------------------------------------------------------------------
		// ---- VARIABLES DE ENTORNO ------------------------------------------------------------

		const activeFileName = vscode.window.activeTextEditor?.document.fileName ?? ''; // Se obtiene el nombre del archivo activo 
		const activeBaseName = activeFileName.split(/[\\/]/).pop() ?? ''; // Se obtiene el nombre del archivo sin la ruta
		const isEnvFile = activeBaseName === '.env' || activeBaseName.startsWith('.env.'); // Solo se valida como variables de entorno si el archivo abierto es un .env

		const variables: string[] = [];

		if (isEnvFile) {
			// Recorre cada linea del documento y se obtienen el nombre de las variables de entorno
			lines.forEach(line => {
				const trimmed = line.trim(); // Se eliminan los espacios en blanco al inicio y al final
				if (trimmed === '' || trimmed.startsWith('#')) {
					return; //Ignorar lineas vacias y comentarios
				}

				const variableName = trimmed.split('=')[0].trim(); // Se obtiene el nombre de la variable de entorno antes del =
				variables.push(variableName); // Se agregar el nombre de la variable de entorno al arreglo
			});
		}

		// Se recorre el arreglo y verifica si cumple con UPPER_SNAKE_CASE
		variables.forEach(name => {
			const isUpperCase = /^[A-Z][A-Z0-9_]*$/.test(name); // Se verifica si el nombre de la variable es UPPER_SNAKE_CASE  
			if (!isUpperCase) {
				vscode.window.showErrorMessage('La variable ' + name + ' no usa UPPER_SNAKE_CASE');
			}
 		});


		// --------------------------------------------------------------------------------------
		// ---- CLASES, FUNCIONES, METODOS, VARIABLES Y CONSTANTES -------------------------------

		const languageId = vscode.window.activeTextEditor?.document.languageId ?? ''; //obtiene el lenguajeId del editor
		const namingConfig = LANGUAGE_NAMING_CONFIGS[languageId]; //busca la configuracion que le corresponde en LENGUAGE_NAMING_CCONFIGS

		if (!namingConfig) { //si no hay config para ese lenguaje muestra mensaje 
			vscode.window.showInformationMessage('La verificación de nombres no soporta el lenguaje "' + languageId + '". Lenguajes soportados: JavaScript, TypeScript, PHP y C#.');
		} else {
			//llama a extractNmaesByCategory para sacar los 5 arreglos de nombres 
			const { classNames, functionNames, methodNames, variableNames, constantNames } = extractNamesByCategory(lines, namingConfig);

			//se llama a esta funcion una vez por categoria usand el CaseStyle que le corresponde a cada uno 
			reportInvalidNames(classNames, namingConfig.classCase, 'La clase');
			reportInvalidNames(functionNames, namingConfig.functionCase, 'La función');
			reportInvalidNames(methodNames, namingConfig.methodCase, 'El método');
			reportInvalidNames(variableNames, namingConfig.variableCase, 'La variable');
			reportInvalidNames(constantNames, namingConfig.constantCase, 'La constante');
		}

	});

	context.subscriptions.push(disposable, disposable2); //Se registran los comandos 
}

// This method is called when your extension is deactivated
export function deactivate() {}
