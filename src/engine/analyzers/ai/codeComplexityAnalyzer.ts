// --------------------------------------------------------------------------------------------
// ---- LOGICA DEMASIADO COMPLEJA: FUNCIONES QUE SE DEBEN SEPARAR EN FRAGMENTOS ---------------
// --------------------------------------------------------------------------------------------

import { callClaude } from '../../shared/claudeClient';
import { collectChangesFunction } from '../../shared/functionExtraction';
import { CodeComplexityConfig } from '../../config/configLoader';

//las funciones muy cortas no pueden ser complejas, se saltan para no gastar llamadas a la API
const MIN_FUNCTION_LINES = 6;

interface ComplexityViolation {
    line: number;
    found: string;
    message: string;
}

//arma el prompt que se le manda a claude
function buildPrompt(functionCode: string, functionName: string): string {
    return [
        'Eres un revisor de estandares de codigo. Analiza la siguiente funcion',
        `("${functionName}") y determina si tiene logica demasiado compleja que dificulta leerla:`,
        'if/else o bucles muy anidados (mas de 3 niveles), condiciones con muchos && o ||,',
        'varios caminos de ejecucion dificiles de seguir o bloques largos que se podrian',
        'extraer a funciones pequenas.',
        'Reporta como maximo UNA violacion por funcion: la linea donde empieza el bloque mas complejo.',
        'Responde UNICAMENTE con JSON valido, sin texto adicional, con este formato:',
        '{"violations":[{"line":<numero de linea dentro del bloque, 1-indexed>,"found":"<que lo hace complejo>","message":"<que fragmento extraer a una funcion pequena>"}]}',
        'Si no hay violaciones responde {"violations":[]}.',
        '',
        'Funcion a analizar:',
        '```',
        functionCode,
        '```',
    ].join('\n');
}

//parsea la respuesta de texto a un arreglo
function parseViolations(rawText: string): ComplexityViolation[] {
    try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/); //extrae el bloque JSON de la respuesta
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        //si es un arreglo lo devuelve (solo con linea numerica), si no, devuelve []
        return Array.isArray(parsed.violations) ? parsed.violations.filter((item: ComplexityViolation) => typeof item.line === 'number') : [];
    } catch {
        return [];
    }
}

//funcion principal
export async function analyzeCodeComplexity(
    lines: string[],
    fileLabel: string,
    findings: string[],
    changedLines: Set<number>,
    config: CodeComplexityConfig
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
                    ' - La funcion "' + block.name + '" tiene logica demasiado compleja: ' + violation.found + ' (' + violation.message + ')'
                );
            }
        } catch (error) {
            findings.push(fileLabel + ':' + block.startLine + ' - No se pudo analizar la complejidad de la funcion (' + (error as Error).message + ')');
        }
    }
}
