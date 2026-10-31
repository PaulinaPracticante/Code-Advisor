// ------------------------------------------------------------------------------------------
// ---- EXTRACCION DE LA FUNCION QUE CONTIENE UN ARCHIVO DE API PARA VALIDAR EL IDIOMA INGLES
// ------------------------------------------------------------------------------------------

//firma de la funcion en C#, TS o JS
const FUNCTION_START_PATTERN = /^(?:(?:public|private|protected|internal|static|async|export|default)\s+)*(?:function\s+)?[\w<>[\],.?]*\s*([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*(?::\s*[\w<>[\],.?]+\s*)?(?:=>)?\s*\{?\s*$/;

//palabras reservadas de control de flujo: coinciden con FUNCTION_START_PATTERN (ej. "if (cond) {")
//pero no son el inicio real de una funcion, hay que seguir buscando hacia atras
const CONTROL_KEYWORDS = /^(?:if|else|for|foreach|while|switch|catch|using|lock|do)$/;

export interface FunctionBlock {
    name: string;
    startLine: number;
    endLine: number;
    code: string;
}

//recibe todas las lienas del archivo y el numero de linea cambiada 
export function extractEnclosingFunction(lines: string[], changedLine: number): FunctionBlock | null {
    let startLine = -1;
    let name = '';

    //recorre hacia atras desde la linea cambiada hasta el principio del archivo 
    for (let i = changedLine - 1; i >= 0; i--) {
        const match = lines[i].trim().match(FUNCTION_START_PATTERN); //por cada liena intenta marchear con FUNCTION_START_PATTERN 
        if (match && !CONTROL_KEYWORDS.test(match[1])) { //si matchea y el nombre capturado no es una palabra de control se asume no es una palabra de control 
            startLine = i;
            name = match[1];
            break;
        }
    }

    //si no encuentra nada retorna null
    if (startLine === -1) { return null; }

    let depth = 0;
    let endLine = -1;
    for (let i = startLine; i < lines.length; i++) {
        depth += (lines[i].match(/\{/g) || []).length;
        depth -= (lines[i].match(/\}/g) || []).length;
        if (depth > 0 && lines[i].includes('}') === false) { continue; }
        if (lines[i].includes('}') && depth <= 0) {
            endLine = i;
            break;
        }

    }

    if (endLine === -1) { return null; }

    return {
        name,
        startLine: startLine + 1,
        endLine: endLine + 1,
        code: lines.slice(startLine, endLine + 1).join('\n'),
    };
}

//funcion principal 
export function collectChangesFunction(lines: string[], changedLines: Set<number>): FunctionBlock[] {
    const seen = new Set<number>();
    const blocks: FunctionBlock[] = [];

    for (const lineNumber of Array.from(changedLines).sort((a, b) => a - b)) {
        const block = extractEnclosingFunction(lines, lineNumber);
        if (block && !seen.has(block.startLine)) {
            seen.add(block.startLine);
            blocks.push(block);
        }
    }

    return blocks; //devuelve la lista con las funciones afectadas en el PR 
}