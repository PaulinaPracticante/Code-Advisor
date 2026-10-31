// --------------------------------------------------------------------------------------------
// ---- VERIFICACION DE IDIOMA (INGLES) EN FUNCIONES NUEVAS/MODIFICADAS, POR CLAUDE -----------
// --------------------------------------------------------------------------------------------

import { callClaude } from '../../shared/claudeClient';
import { collectChangesFunction } from '../../shared/functionExtraction';
import { EnglishOnlyConfig } from '../../config/configLoader';

interface EnglishViolation {
    line: number;
    found: string;
    message: string;
}

//arma el prompt que se le manda a claude 
function buildPrompt(functionCode: string, functionName: string): string {
    return [
        'Eres un revisor de estandares de codigo. Analiza la siguiente funcion',
        `("${functionName}") y detecta si algun identificador (variables, parametros,`,
        'metodos, clases) o comentario esta escrito en espanol en lugar de ingles.',
        'Ingnora por completo los comentarios  (lineas que empieza con // o bloques /* */),',
        'Responde UNICAMENTE con JSON valido, sin texto adicional, con este formato:',
        '{"violations":[{"line":<numero de linea dentro del bloque, 1-indexed>, "found":"<texto en espanol>","message":"<explicacion breve>"}]}',
        'Si no hay violaciones responde {"violations":[]}.',
        '',
        'Funcion a analizar:',
        '```',
        functionCode,
        '```',
    ].join('\n');
}

//parsea la respuesta d texto de claude a un arreglo 
function parseViolations(rawText: string): EnglishViolation[] {
    try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/); //extrae el bloque JSON de la respuesta 
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        return Array.isArray(parsed.violations) ? parsed.violations : []; //si es un arreglo lo devulve, si no, devuelve []
    } catch {
        return [];
    }
}

//funcion exportada 
export async function analyzeEnglishLanguage(
    lines: string[], 
    fileLabel: string,
    findings: string[],
    changedLines: Set<number>,
    config: EnglishOnlyConfig
): Promise<void> {
    const functions = collectChangesFunction(lines, changedLines); //obtiene las funciones afectadas por los cambios 

    //por cada funcion 
    for (const block of functions) {
        try {
            const prompt = buildPrompt(block.code, block.name); //construye el prompt
            const responseText = await callClaude(prompt, { model: config.model}); //llama a claude 
            
            // por cada hallazgo encontrado calcula la linea en el archivo 
            for (const violation of parseViolations(responseText)) {
                const absoluteLine = block.startLine + violation.line - 1;
                findings.push(
                    fileLabel + ':' + absoluteLine + 
                    ' - "' + violation.found + '" esta en español, usa ingles (' + violation.message + ')'
                );
            }
        } catch (error) {
            findings.push(fileLabel + ':' + block.startLine + ' - No se pudo analizar el idioma (' + (error as Error).message + ')');
        }
    }
}