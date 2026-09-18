// -------------------------------------------------------------------------------
// ---- CONFIGURACION DE ESTILOS DE NOMBRES POR LENGUAJE --------------------------
// -------------------------------------------------------------------------------

//Tipo con los estilos que se deben de reconocer
export type CaseStyle = 'PascalCase' | 'camelCase' | 'UPPER_SNAKE_CASE';

//Funcion que determina si el nombre si cumple con el estilo esperado
export function matchesCase(name: string, caseStyle: CaseStyle): boolean {
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
export interface LanguageNamingConfig {
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
export const LANGUAGE_NAMING_CONFIGS: Record<string, LanguageNamingConfig> = {
	javascript: JS_TS_NAMING_CONFIG,
	javascriptreact: JS_TS_NAMING_CONFIG,
	typescript: JS_TS_NAMING_CONFIG,
	typescriptreact: JS_TS_NAMING_CONFIG,
	php: PHP_NAMING_CONFIG,
	csharp: CSHARP_NAMING_CONFIG,
};

//Mapa de extension de archivo a languageId, para poder analizar archivos que no estan abiertos en el editor
export const EXTENSION_TO_LANGUAGE_ID: Record<string, string> = {
	ts: 'typescript',
	tsx: 'typescriptreact',
	js: 'javascript',
	jsx: 'javascriptreact',
	php: 'php',
	cs: 'csharp',
};
