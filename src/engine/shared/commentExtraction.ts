// ------------------------------------------------------------------------------------------
// ---- EXTRACCION DE LOS COMENTARIOS AGREGADOS O MODIFICADOS EN UN ARCHIVO ------------------
// ------------------------------------------------------------------------------------------

export interface CommentLine {
    line: number; //numero de linea (1-indexado) donde esta el comentario
    text: string; //texto del comentario sin los marcadores //, /* y *
}

//directivas de herramientas (eslint, typescript, prettier, regiones), no las escribe una persona para explicar el codigo
const DIRECTIVE_PATTERN = /^(?:eslint|tslint|jshint|@ts-|prettier-ignore|istanbul|webpack|#?region\b|#?endregion\b)/i;

//lineas decorativas que solo traen guiones, signos de igual, asteriscos,
const DECORATIVE_PATTERN = /^[\s\-=*_#/~.]*$/;

//un comentario necesita al menos una palabra de 3 letras para que valga la pena revisarle el idioma
const WORD_PATTERN = /[A-Za-zÀ-ÿ]{3,}/;

//limpia el texto de un comentario, quita el asterisco con el que empiezan las lineas de un bloque /** */
function cleanCommentText(rawText: string): string {
    return rawText.trim().replace(/^\*+\s*/, '').trim();
}

//recorre el archivo y regresa los comentarios que estan en lineas cambiadas
//lleva el estado de bloque /* */ y de strings para no confundir un "//" de una url con un comentario
export function extractComments(lines: string[], changedLines: Set<number>): CommentLine[] {
    const comments: CommentLine[] = [];
    let insideBlock = false; //true mientras se esta adentro de un comentario /* */ que viene de una linea anterior
    let quote: string | null = null; //comilla del string que se esta recorriendo

    lines.forEach((line, i) => {
        let commentText = '';
        let col = 0;

        while (col < line.length) {
            const char = line[col];
            const next = line[col + 1];

            if (insideBlock) { //adentro de un bloque, todo es comentario hasta encontrar */
                const end = line.indexOf('*/', col);
                commentText += ' ' + line.slice(col, end === -1 ? line.length : end);
                if (end === -1) {
                    col = line.length;
                } else {
                    insideBlock = false;
                    col = end + 2;
                }
                continue;
            }

            if (quote) { //adentro de un string, se busca la comilla que lo cierra
                if (char === '\\') { col += 2; continue; } //caracter escapado
                if (char === quote) { quote = null; }
                col++;
                continue;
            }

            if (char === '"' || char === '\'' || char === '`') { quote = char; col++; continue; }
            if (char === '/' && next === '/') { commentText += ' ' + line.slice(col + 2); break; } //comentario de linea
            if (char === '/' && next === '*') { insideBlock = true; col += 2; continue; } //inicia un bloque
            col++;
        }

        //las comillas simples y dobles no cruzan lineas (solo las plantillas con `), se reinician para no arrastrar un apostrofe de un texto JSX
        if (quote !== null && quote !== '`') { quote = null; }

        if (!changedLines.has(i + 1)) { return; }

        const text = cleanCommentText(commentText);
        if (text === '' || DECORATIVE_PATTERN.test(text) || DIRECTIVE_PATTERN.test(text) || !WORD_PATTERN.test(text)) { return; }
        comments.push({ line: i + 1, text });
    });

    return comments;
}
