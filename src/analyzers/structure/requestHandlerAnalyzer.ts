// -------------------------------------------------------------------------------------------------------
// ---- VERIFICACION DEL MANEJADOR DE PETICIONES HTTP SEGUN EL CONTEXTO -----------------------------------
// -------------------------------------------------------------------------------------------------------

import { RequestHnadlersConfig } from "../../config/configLoader";

//contextos posibles de un archivo, cada uno define que manejador de peticiones se espera
type RequestContext = 'next' | 'react' | 'reactNative' | 'legacyJs' | 'php';

//señales de import/uso para deducir en que contexto esta un .js/.jsx/.ts/.tsx
const NEXT_IMPORT_PATTERN = /from\s+['"]next(?:\/[^'"]*)?['"]/; //busca next o next/...
const REACT_NATIVE_IMPORT_PATTERN = /from\s+['"]react-native['"]/; // busca from 'react-native'
const REACT_IMPORT_PATTERN = /from\s+['"]react['"]/; //busca from 'react'
const JQUERY_SIGNAL_PATTERN = /from\s+['"]jquery['"]|\s$\..(ajax|get|post|getJSON)\s*\(/; //busca 'jquery' o un $.ajax(...

// llamadas de peticion que puede haber en el cuerpo del archivo
const FETCH_CALL_PATTERN = /\bfetch\s*\(/;
const AXIOS_CALL_PATTERN = /\baxios(?:\.\w+)?\s*\(/;
const JQUERY_CALL_PATTERN = /\$\.(ajax|get|post|getJSON)\s*\(/;
const XHR_PATTERN = /\bnew\s+XMLHttpRequest\s*\(/;

//llamadas de peticion en PHP
const PHP_CURL_PATTERN = /\bcurl_init\s*\(/;
const PHP_FILE_GET_CONTENTS_PATTERN = /\bfile_get_contents\s*\(\s*['"]https?:/;
const PHP_GUZZLE_PATTERN = /GuzzleHttp|->\s*(get|post|request)Async?\s*\(/;

//quita la linea de los comentarios 
function stripLineComment(rawLine: string): string {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

//revisa todo el archivo para decidir que handler se espera en un .js/.jsx/.ts/.tsx
function detectJsContext(lines: string[]): RequestContext | null {
    const content = lines.join('\n');
    if (NEXT_IMPORT_PATTERN.test(content)) { return 'next'; }
    if (REACT_NATIVE_IMPORT_PATTERN.test(content)) { return 'reactNative'; }
    if (JQUERY_SIGNAL_PATTERN.test(content)) { return 'legacyJs'; }
    if (REACT_IMPORT_PATTERN.test(content)) { return 'react'; }
    return null; // sin señales suficientes, se ignora el archivo 
}

//regresa el manejador esperado ('fetch' o 'axios') para el contexto segun la configuracion
function expectedHandlerFor(context: RequestContext, config: RequestHnadlersConfig): 'fetch' | 'axios' {
    switch (context) { 
        case 'next': return config.next.expected;
        case 'reactNative': return config.reactNative.expected;
        case 'legacyJs': return config.legacyJs.expected;
        case 'php': return config.legacyJs.expected;
        case 'react': return config.react.expected;
    }
}

//nombre legible de cada contexto para mostrarlo en el reporte
const CONTEXT_LABELS: Record<RequestContext, string> = {
    next: 'Next.js',
    react: 'React',
    reactNative: 'React Native',
    legacyJs: 'jQuery',
    php: 'PHP',
};

//revisa una linea y reporta si usa un handler distinto esperado para el contexto
function reportLine(rawLine: string, lineNumber: number, fileLabel: string, context: RequestContext, expected: 'fetch' | 'axios', findings: string[]): void {
    const line =  stripLineComment(rawLine);
    const where = fileLabel + ':' + lineNumber;

    let found: string | null = null;
    if (FETCH_CALL_PATTERN.test(line)) { found = 'fetch'; }
    else if (AXIOS_CALL_PATTERN.test(line)) { found = 'axios'; }
    else if (JQUERY_CALL_PATTERN.test(line)) { found = 'jQuery'; }
    else if (XHR_PATTERN.test(line)) { found = 'XMLHttpRequest'; }
    else if (PHP_CURL_PATTERN.test(line)) { found = 'cURL'; }
    else if (PHP_FILE_GET_CONTENTS_PATTERN.test(line)) { found = 'file_get_contents'; }
    else if (PHP_GUZZLE_PATTERN.test(line)) { found = 'Guzzle'; }

    if (found && found.toLowerCase() !== expected) {
        findings.push(where + ' - en este contexto (' + CONTEXT_LABELS[context] + ') se debe usar "' + expected + '"; se encontro "' + found + '"');
    }
}

//funcion principal 
export function analyzeRequestHandlers(
    lines: string[],
    fileLabel: string,
    findings: string[],
    changedLines: Set<number>,
    config: RequestHnadlersConfig,
): void {
    //si el archivo es .php no hace falta detectar nada
    if (fileLabel.endsWith('.php')) {
        const expected = expectedHandlerFor('php', config);
        lines.forEach((rawLine, i) => {
            if (!changedLines.has(i + 1)) { return; }
            reportLine(rawLine, i + 1, fileLabel, 'php', expected, findings);
        });
        return;
    }

    const context = detectJsContext(lines);
    if (!context) { return; }

    const expected = expectedHandlerFor(context, config);
    lines.forEach((rawLine, i) => {
        if (!changedLines.has(i + 1)) { return; }
        reportLine(rawLine, i + 1, fileLabel, context, expected, findings);
    });
}