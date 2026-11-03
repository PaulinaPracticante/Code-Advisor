// ------------------------------------------------------------------------------------------
// ---- EXTRACCION DE LA FUNCION QUE CONTIENE UN ARCHIVO DE API PARA VALIDAR EL IDIOMA INGLES
// ------------------------------------------------------------------------------------------

//firma de la funcion en C#, TS o JS (el tipo de retorno es opcional y debe ir separado por espacio, si no el nombre se confunde con el tipo)
const FUNCTION_START_PATTERN = /^(?!(?:return|await|new|throw|else)\b)(?:(?:public|private|protected|internal|static|async|export|default)\s+)*(?:function\s+)?(?:[\w<>[\],.?]+\s+)?([A-Za-z_][A-Za-z0-9_]*)(?:<[^>(]*>)?\s*\([^)]*\)\s*(?::\s*[\w<>[\],.?]+\s*)?(?:=>)?\s*\{?\s*$/;

//firma de una funcion flecha asignada a una constante, ej. componentes de React y hooks: const Foo = (props) => {
const ARROW_FUNCTION_START_PATTERN = /^(?:export\s+)?(?:default\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+?)?\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::\s*[\w<>[\],.?|\s]+?)?\s*=>\s*\{?\s*$/;

//palabras reservadas de control de flujo: coinciden con FUNCTION_START_PATTERN (ej. "if (cond) {")
//pero no son el inicio real de una funcion, hay que seguir buscando hacia atras
const CONTROL_KEYWORDS = /^(?:if|else|for|foreach|while|switch|catch|using|lock|do)$/;

export interface FunctionBlock {
    name: string;
    startLine: number;
    endLine: number;
    code: string;
}

//revisa si la linea es el inicio de una funcion y regresa su nombre, si no lo es regresa null
function matchFunctionName(rawLine: string): string | null {
    const trimmed = rawLine.trim();
    const match = trimmed.match(FUNCTION_START_PATTERN); //primero intenta con la firma normal
    if (match && !CONTROL_KEYWORDS.test(match[1])) { //si matchea y el nombre capturado no es una palabra de control se asume que es una funcion
        return match[1];
    }
    const arrowMatch = trimmed.match(ARROW_FUNCTION_START_PATTERN); //si no, intenta con la funcion flecha
    return arrowMatch ? arrowMatch[1] : null;
}

//cuenta las llaves desde la linea de inicio hasta encontrar la que cierra la funcion, regresa -1 si nunca cierra
function findFunctionEnd(lines: string[], startLine: number): number {
    let depth = 0;
    for (let i = startLine; i < lines.length; i++) {
        depth += (lines[i].match(/\{/g) || []).length;
        depth -= (lines[i].match(/\}/g) || []).length;
        if (depth > 0 && lines[i].includes('}') === false) { continue; }
        if (lines[i].includes('}') && depth <= 0) {
            return i;
        }
    }
    return -1;
}

//recibe todas las lienas del archivo y el numero de linea cambiada
export function extractEnclosingFunction(lines: string[], changedLine: number): FunctionBlock | null {
    //recorre hacia atras desde la linea cambiada hasta el principio del archivo
    for (let i = changedLine - 1; i >= 0; i--) {
        const name = matchFunctionName(lines[i]);
        if (!name) { continue; }

        const endLine = findFunctionEnd(lines, i);
        //si la funcion ya cerro antes de la linea cambiada no la contiene, se sigue buscando hacia atras por si hay una funcion exterior
        if (endLine === -1 || endLine + 1 < changedLine) { continue; }

        return {
            name,
            startLine: i + 1,
            endLine: endLine + 1,
            code: lines.slice(i, endLine + 1).join('\n'),
        };
    }

    //si no encuentra nada retorna null
    return null;
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


const CLASS_DECLARATION_PATTERN = /^(?:(?:public|private|protected|internal|export|default|static|abstract|sealed)\s+)*class\s+([A-Za-z_][A-Za-z0-9_]*)/;

//busca desde el inicio de la funcion la clase que la contiene
export function findEnclosingClassName(lines: string[], startLine: number): string | null {
    for (let i = startLine; i >= 0; i--) {
        const match = lines[i].trim().match(CLASS_DECLARATION_PATTERN);
        if (match) { return match[1]; }
    }
    return null;
}
