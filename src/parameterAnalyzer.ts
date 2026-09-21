// -------------------------------------------------------------------------------
// ---- VERIFICACION DE PARAMETROS: MAS DE 3 DEBEN IR EN VARIAS LINEAS -----------
// -------------------------------------------------------------------------------

const MAX_LINE_LENGHT = 120; //limite de carcacteres por linea
const MAX_INLINE_PARAMS = 3; // maximo de parametros permitidos por linea 

//funcion que ignora los comentarios en el archivo 
function stripLineComment(rawLine: string) {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

//Busca el inico del '(' y donde se cierra ')'
function findClosingParen(lines: string[], lineIndex: number, openIndex: number): { line: number; col: number } | null {
    let depth = 0;
    //recorre caracter por caracter llevando un contador que con sube con ( y baja con )
    for (let i = lineIndex; i < lines.length; i++) {
        const text = stripLineComment(lines[i]);
        const start = i === lineIndex ? openIndex : 0;
        for (let col = start; col < text.length; col++) {
            if (text[col] === '(') {
                depth++;
            } else if (text[col] === ')') {
                depth--;
                if (depth === 0) { // cuando depth llega a 0 es porque ahi esta el cierre del parentesis
                    return  { line: i, col}; // devuelve linea y columna de este cierre
                }
            }
        }
    }
    return null; //devuelve null si nunca cierra
}

//cuenta cuantos parametos hay , solo cuenta comas, ignora comas dentro de sub-parentesis 
function countTopLevelParams(paramsText: string) : number {
    // divide los parametos 
    const trimmed = paramsText.trim();
    if (trimmed === '') {
        return 0;
    } 

    let depth = 0;
    let count = 1;
    for (const char of trimmed) {
        if ('([{<'.includes(char)) {
            depth++;
        } else if (')]}>'.includes(char)) {
            depth--;
        } else if (char === ',' && depth === 0) { //si encuentra una coma y el nivel es 0 es porque hay un parametro mas 
            count++;
        }
    }
    return count; //devuelve el numero de parametros 
}

//funcion principal para hacer el analisis de cuantos parametros hay en una funcion 
export function analyzeParameters(lines: string[], fileLabel: string, findings: string[]): void {
    //recorre cada linea del archivo 
    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine); //busca un patron de incio de cualquier llamada o declaracion de funcion 
        const match = line.match(/\b[A-Za-z_$][\w$]*\s*\(/);
        if (!match || match.index === undefined) {
            return;
        }

        const openIndex = match.index + match[0].length - 1;
        const closing = findClosingParen(lines, i, openIndex); //localiza donde abre y cierra el parentesis 
        if (!closing) {
            return;
        }

        //Arma el texto cpmleto en una sola linea , si abre y cierra en la misma liena es directo 
        let paramsText = closing.line === i
            ? line.slice(openIndex + 1, closing.col)
            : line.slice(openIndex + 1);

        //si cruza varias lineas, va concatenando el restp de cada linea 
        if (closing.line !== i) {
            for (let j = i + 1; j < closing.line; j++) {
                paramsText += ' ' + stripLineComment(line[j]);
            }
            paramsText += ' ' + stripLineComment(lines[closing.line]).slice(0, closing.col);
        }

        //cuenta los parametros, si son 3 o menos no reporta nada 
        const paramCount = countTopLevelParams(paramsText);
        if (paramCount <= MAX_INLINE_PARAMS) {
            return;
        }

        //si son mas de tres parametros reporta el hallazgo 
        if (closing.line === i) {
            findings.push(fileLabel + ':' + (i + 1) + ' - El metodo tiene mas de ' + MAX_INLINE_PARAMS + ' parametros, separalos en una linea por parametro con su tabulador');
        }

        //si la linea excede 120 caracteres tambien reporta el hallazgo que la linea es muy larga 
        if (rawLine.length > MAX_LINE_LENGHT) {
            findings.push(fileLabel + ':' + (i + 1) + ' - La linea es muy larga (' + rawLine.length + 'caracteres), evita lienas demasiado largas');
        }
    });
}