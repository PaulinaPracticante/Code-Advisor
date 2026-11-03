// --------------------------------------------------------------------------------------------
// ---- FUNCIONES DE UN SOLO USO: CADA FUNCION DEBE HACER UNA SOLA COSA, ----------------------
// --------------------------------------------------------------------------------------------

import { callClaude } from '../../shared/claudeClient';
import { collectChangesFunction } from '../../shared/functionExtraction';
import { SingleResponsibilityConfig } from '../../config/configLoader';

//las funciones muy cortas no pueden mezclar responsabilidades, se saltan para no gastar llamadas a la API
const MIN_FUNCTION_LINES = 6;

interface ResponsibilityViolation {
    line: number;
    found: string;
    message: string;
}

//arma el prompt que se le manda a claude
function buildPrompt(functionCode: string, functionName: string): string {
    return [
        'Eres un revisor de estandares de codigo. Analiza la siguiente funcion',
        `("${functionName}") y determina si hace una sola cosa o si mezcla varias`,
        'responsabilidades distintas (por ejemplo validar datos, consultar la base de datos,',
        'transformar la informacion y armar la respuesta, todo en la misma funcion).',
        'Una funcion que solo coordina llamadas a otras funciones pequenas si cumple con una sola responsabilidad.',
        'Reporta como maximo UNA violacion por funcion: la linea donde empieza la responsabilidad que sobra.',
        'Responde UNICAMENTE con JSON valido, sin texto adicional, con este formato:',
        '{"violations":[{"line":<numero de linea dentro del bloque, 1-indexed>,"found":"<responsabilidad que sobra>","message":"<como separarla en otra funcion>"}]}',
        'Si no hay violaciones responde {"violations":[]}.',
        '',
        'Funcion a analizar:',
        '```',
        functionCode,
        '```',
    ].join('\n');
}

//parsea la respuesta de texto a un arreglo
function parseViolations(rawText: string): ResponsibilityViolation[] {
    try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/); //extrae el bloque JSON de la respuesta
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        //si es un arreglo lo devuelve (solo con linea numerica), si no, devuelve []
        return Array.isArray(parsed.violations) ? parsed.violations.filter((item: ResponsibilityViolation) => typeof item.line === 'number') : [];
    } catch {
        return [];
    }
}

//funcion principal
export async function analyzeSingleResponsibility(
    lines: string[],
    fileLabel: string,
    findings: string[],
    changedLines: Set<number>,
    config: SingleResponsibilityConfig
): Promise<void> {
    const functions = collectChangesFunction(lines, changedLines); //obtiene las funciones afectadas por los cambios

    //por cada funcion
    for (const block of functions) {
        if (block.endLine - block.startLine + 1 < MIN_FUNCTION_LINES) { continue; } //las funciones muy cortas no se mandan 

        try {
            const prompt = buildPrompt(block.code, block.name); //construye el prompt
            const responseText = await callClaude(prompt, { model: config.model }); //llama a claude

            //por cada hallazgo encontrado calcula la linea en el archivo
            for (const violation of parseViolations(responseText)) {
                const absoluteLine = block.startLine + violation.line - 1;
                findings.push(
                    fileLabel + ':' + absoluteLine +
                    ' - La funcion "' + block.name + '" hace mas de una cosa: ' + violation.found + ' (' + violation.message + ')'
                );
            }
        } catch (error) {
            findings.push(fileLabel + ':' + block.startLine + ' - No se pudo analizar la responsabilidad de la funcion (' + (error as Error).message + ')');
        }
    }
}
