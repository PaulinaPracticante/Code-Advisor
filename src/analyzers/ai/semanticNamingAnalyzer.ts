// ---------------------------------------------------------------------------------------
// ---- COHERENCIA SEMANTICA: NOMBRE DE CLASE Y VARIABLES --------------------------------
// ---------------------------------------------------------------------------------------

import { callClaude } from "../../shared/claudeClient";
import { collectChangesFunction, findEnclosingClassName } from "../../shared/functionExtraction";
import { SemanticNameConfig } from "../../config/configLoader";

//forma de hallazgo que devuelve claude 
interface NamingViolation {
    line: number;
    found: string;
    message: string;
}

//prompt que se le manda a claude 
function buildPrompt(functionCode: string, functionName: string, className: string | null): string {
    return [
        'Eres un revisor de estandares de codigo. Analiza la siguiente funcion',
        `("${functionName}")${className ? ` que pertenece a la clase "${className}"` : ''}.`,
        'Determina si:',
        '1) El nombre de la clase refleja la responsabilidad que se ve en esta funcion (si aplica).',
        '2) Los nombes de variables/parametros describen lo que realmente almacenan o hacen.',
        'No marques violaciones de idimoa, solo de significado/coherencia.',
        'Responde UNICAMENTE con JSON valido:',
        '{"violations":[{"line":<numeor de linea dentro del bloque, 1-indexed>,"found":"<identificador>","message":"<por que no es coherente y que nombre sugieres>"}]}',
        'Si no hay violaciones responde {"violations":[]}.',
        '',
        'Funcion a analizar:',
        '```',
        functionCode,
        '```',
    ].join('\n');
}

//extrae el bloque json de la respuesta 
function parseViolations(rawText: string): NamingViolation[] {
    try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0]: rawText);
        return Array.isArray(parsed.violations) ? parsed.violations : [];
    } catch {
        return [];
    }
}

//funcion principal 
export async function analyzeSemanticNaming(
    lines: string[],
    fileLabel:string,
    findings: string[],
    changedLines: Set<number>,
    config: SemanticNameConfig
): Promise<void> {
    const functions = collectChangesFunction(lines, changedLines); //obtiene las funciones afectados en el PR 
    const reportedClassNames = new Set<string>(); //fuarda que nombres de clase ya generaron un hallazgo para que no se repita en otro hallazgo

    //por cada funcion 
    for (const block of functions) {
        try {
            const className = findEnclosingClassName(lines,block.startLine - 1); //busca el nombre de la clase y le resta 1 a block.startLine
            const prompt = buildPrompt(block.code, block.name, className); //arma el prompt
            const responseText = await callClaude(prompt, { model: config.model });

            //por cada hallazgo 
            for (const violation of parseViolations(responseText)) {
                //determina si la violacion es sobre el nombre de la clase, comparando si hay dos hallazgos iguales 
                const isClassViolation = className !== null && violation.found === className;
                if (isClassViolation) { //si es sobre la clase 
                    if (reportedClassNames.has(className)) { continue; } // y ya fue reportada antes , se descarta 
                    reportedClassNames.add(className); //si es la primera vez, se marca como reportada 
                }

                const absoluteLine = block.startLine + violation.line - 1; //calcula la linea en el archivo 
                findings.push( //agrega el hallazgo
                    fileLabel + ':' + absoluteLine + 
                    ' - "' + violation.found + '" no es un nombre coherente con lo que hace (' + violation.message + ')'
                );
            }
        }catch (error) {
            findings.push(fileLabel + ':' + block.startLine + ' - No se pudo analizar coherencia de nombres (' + (error as Error).message + ')');
        }
    }
}