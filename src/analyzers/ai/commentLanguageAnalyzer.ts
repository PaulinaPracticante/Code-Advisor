// --------------------------------------------------------------------------------------------
// ---- VERIFICACION DE IDIOMA (ESPAÑOL) EN LOS COMENTARIOS NUEVOS/MODIFICADOS ----------------
// --------------------------------------------------------------------------------------------

import { callClaude } from '../../shared/claudeClient';
import { CommentLine, extractComments } from '../../shared/commentExtraction';
import { CommentLanguageConfig } from '../../config/configLoader';

//cantidad maxima de comentarios en una sola llamada, para no armar prompts grandes
const COMMENTS_PER_REQUEST = 40;

interface CommentViolation {
    line: number;
    found: string;
    message: string;
}

//arma el prompt que se manda con una tanda de comentarios
function buildPrompt(comments: CommentLine[]): string {
    return [
        'Eres un revisor de estandares de codigo. Los comentarios del codigo deben estar escritos en espanol.',
        'A continuacion hay comentarios, uno por linea, con el formato "<numero de linea>: <texto>".',
        'Indica cuales NO estan escritos en espanol (por ejemplo los que estan en ingles).',
        'Ignora los terminos tecnicos, nombres de librerias, nombres de variables, codigo y urls que',
        'aparezcan dentro del comentario; solo importa el idioma del texto que lo explica.',
        'Un comentario puede ser solo un fragmento de una oracion que sigue en la linea de abajo.',
        'Responde UNICAMENTE con JSON valido, sin texto adicional, con este formato:',
        '{"violations":[{"line":<numero de linea del archivo>,"found":"<comentario>","message":"<explicacion breve>"}]}',
        'Si todos estan en espanol responde {"violations":[]}.',
        '',
        'Comentarios a analizar:',
        '```',
        comments.map(comment => comment.line + ': ' + comment.text).join('\n'),
        '```',
    ].join('\n');
}

//parsea la respuesta de texto a un arreglo
function parseViolations(rawText: string): CommentViolation[] {
    try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/); //extrae el bloque JSON de la respuesta
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        return Array.isArray(parsed.violations) ? parsed.violations : []; //si es un arreglo lo devuelve, si no devuelve []
    } catch {
        return [];
    }
}

//funcion principal
export async function analyzeCommentLanguage(
    lines: string[],
    fileLabel: string,
    findings: string[],
    changedLines: Set<number>,
    config: CommentLanguageConfig
): Promise<void> {
    //el estandar de comentarios en español es del frontend, los archivos de c# no se revisan
    if (fileLabel.endsWith('.cs')) { return; }

    const comments = extractComments(lines, changedLines); //obtiene los comentarios agregados o modificados en el PR

    //manda los comentarios por tandas
    for (let start = 0; start < comments.length; start += COMMENTS_PER_REQUEST) {
        const batch = comments.slice(start, start + COMMENTS_PER_REQUEST);

        try {
            const responseText = await callClaude(buildPrompt(batch), { model: config.model, maxTokens: 2048 }); //llamada a la ia

            //por cada hallazgo solo se acepta si la linea es de un comentario que se mando
            for (const violation of parseViolations(responseText)) {
                if (!batch.some(comment => comment.line === violation.line)) { continue; }
                findings.push(
                    fileLabel + ':' + violation.line +
                    ' - El comentario "' + violation.found + '" no esta en español, usa español (' + violation.message + ')'
                );
            }
        } catch (error) {
            findings.push(fileLabel + ':' + batch[0].line + ' - No se pudo analizar el idioma de los comentarios (' + (error as Error).message + ')');
        }
    }
}
