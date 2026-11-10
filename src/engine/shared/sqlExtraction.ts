// ------------------------------------------------------------------------------------------
// ---- EXTRACCION DE LAS CONSULTAS SQL ESCRITAS COMO TEXTO DENTRO DEL CODIGO ----------------
// ------------------------------------------------------------------------------------------

export interface SqlStatement {
    startLine: number; //linea (1-indexada) donde empieza el texto de la consulta
    endLine: number; //linea (1-indexada) donde termina
    text: string; //consulta completa en una sola linea, con los espacios normalizados
}

//un texto de c#, js o php (entre comillas) con su posicion dentro del archivo
interface StringLiteral {
    startLine: number;
    endLine: number;
    start: number; //posicion donde empieza, contando el prefijo @ o $ de c#
    end: number; //posicion donde termina, ya despues de la comilla que cierra
    value: string;
}

//el texto debe empezar con alguna de estas sentencias para considerarlo SQL y no un mensaje cualquiera
const SQL_START_PATTERN = /^(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|WITH)\b/i;
//y traer alguna de estas palabras, el FROM no puede ser de una frase en ingles
const SQL_BODY_PATTERN = /\bFROM\s+(?!the\b|a\b|an\b|this\b|that\b|your\b)|\bINTO\b|\bSET\b/i;

//recorre el archivo completo y saca todos los textos entre comillas, llevando la cuenta de las lineas
//soporta "..." '...' `...` y las formas de c# @"..." (verbatim, puede ocupar varias lineas) y $"..." 
function collectStringLiterals(source: string): StringLiteral[] {
    const literals: StringLiteral[] = [];
    let line = 1;
    let i = 0;

    while (i < source.length) {
        const char = source[i];
        const next = source[i + 1];

        if (char === '\n') { line++; i++; continue; }

        //los comentarios no se revisan, se saltan para que un apostrofe de un comentario no abra un texto
        if (char === '/' && next === '/') {
            while (i < source.length && source[i] !== '\n') { i++; }
            continue;
        }
        if (char === '/' && next === '*') {
            const closing = source.indexOf('*/', i + 2);
            const stop = closing === -1 ? source.length : closing + 2;
            for (let k = i; k < stop; k++) { if (source[k] === '\n') { line++; } }
            i = stop;
            continue;
        }

        //busca donde esta la comilla que abre el texto y si es verbatim (@"...")
        let quoteIndex = -1;
        let verbatim = false;
        if (char === '@' || char === '$') {
            let k = i;
            while (source[k] === '@' || source[k] === '$') {
                if (source[k] === '@') { verbatim = true; }
                k++;
            }
            if (source[k] === '"') { quoteIndex = k; }
        } else if (char === '"' || char === '\'' || char === '`') {
            quoteIndex = i;
        }
        if (quoteIndex === -1) { i++; continue; }

        const quote = source[quoteIndex];
        const multiline = verbatim || quote === '`'; //solo estos textos pueden ocupar varias lineas
        const startLine = line;
        let value = '';
        let j = quoteIndex + 1;
        let closed = false;

        while (j < source.length) {
            const c = source[j];
            if (c === '\n') {
                if (!multiline) { break; } //un texto normal no cruza lineas, es un apostrofe suelto y no se toma como texto
                line++;
            }
            if (!verbatim && c === '\\') { //caracter escapado
                value += source[j + 1] ?? '';
                if (source[j + 1] === '\n') { line++; }
                j += 2;
                continue;
            }
            if (c === quote) {
                if (verbatim && source[j + 1] === quote) { value += quote; j += 2; continue; } // "" dentro de un verbatim es una comilla
                closed = true;
                break;
            }
            value += c;
            j++;
        }

        if (!closed) { //no cerro, se regresa la cuenta de lineas y se sigue despues de la comilla
            line = startLine;
            i = quoteIndex + 1;
            continue;
        }

        literals.push({ startLine, endLine: line, start: i, end: j + 1, value });
        i = j + 1;
    }

    return literals;
}

//junta los textos que se concatenan con + (c#, js) o con . (php) para armar una sola consulta en varias lineas
//lo que se concatena que no es texto (variables o llamadas) se cambia por __EXPR__
function mergeConcatenated(source: string, literals: StringLiteral[]): StringLiteral[] {
    const merged: StringLiteral[] = [];

    for (const literal of literals) {
        const previous = merged[merged.length - 1];
        if (previous) {
            const gap = source.slice(previous.end, literal.start);
            //entre los dos textos solo puede haber un + o . con a lo mucho una variable, nunca una coma, un ; ni llaves ni un =
            if (gap.length <= 80 && /^\s*[+.]/.test(gap) && !/[,;{}=]/.test(gap)) {
                previous.value += (/[\w$]/.test(gap) ? ' __EXPR__ ' : '') + literal.value;
                previous.end = literal.end;
                previous.endLine = literal.endLine;
                continue;
            }
        }
        merged.push({ ...literal });
    }

    return merged;
}

//funcion principal, recibe las lineas del archivo y regresa las consultas SQL que encuentra
export function extractSqlStatements(lines: string[]): SqlStatement[] {
    const source = lines.join('\n');
    const statements: SqlStatement[] = [];

    for (const literal of mergeConcatenated(source, collectStringLiterals(source))) {
        const text = literal.value.replace(/\s+/g, ' ').trim();
        if (SQL_START_PATTERN.test(text) && SQL_BODY_PATTERN.test(text)) {
            statements.push({ startLine: literal.startLine, endLine: literal.endLine, text });
        }
    }

    return statements;
}
