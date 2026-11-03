// ---------------------------------------------------------------------------------------
// ----- REVISION COMBINADA DE IA: INGLES, COHERENCIA DE NOMBRES, RESPONSABILIDAD UNICA, -
// ----- COMPLEJIDAD Y COMENTARIOS EN UNA SOLA LLAMADA A LA IA POR EJECUCION DE COMANDO --

import { json } from "stream/consumers";
import { callClaude } from "../../shared/claudeClient";

const MIN_FUNCTION_LINES = 5;

export interface AiFunctionChecks {
    english: boolean;
    semantic: boolean;
    singleResponsability: boolean;
    complexity: boolean;
}

export interface AiFunctionTask {
    id: string;
    fileLabel: string;
    functionName: string;
    className: string | null;
    startLine: number;
    code: string;
    checks: AiFunctionChecks;
}

export interface AiCommentTask {
    id: string;
    fileLabel: string;
    line: number;
    text: string;
}

export interface AiReviewConfig {
    model: string;
    maxTokens: number;
}

type FunctionCheckName = 'idioma_ingles' | 'coherencia_nombres' | 'responsabilidad_unica' | 'complejidad';

interface CombinedFunctionFinding {
    id: string;
    check: FunctionCheckName;
    line: number;
    found: string;
    message: string;
}

interface CombinedCommentFinding {
    id: string;
    message: string;
}

// arma la lista de checks en español para avisarle a la ia cuales aplicar cada funcion
function describeChecks(checks: AiFunctionChecks): string {
    return [
        checks.english ? 'idioma_ingles' : null,
        checks.semantic ? 'coherencia_nombres' : null,
        checks.singleResponsability ? 'responsabilidad_unica' : null,
        checks.complexity ? 'complejidad' : null,
    ].filter(Boolean).join(', ');
}

// arma un prompt uncio con todas las funciones y comentarios del PR
function buildCombinedPrompt(functionTasks: AiFunctionTask[], commentTasks: AiCommentTask[]): string {
    const functionSection = functionTasks.map(task =>  [
        `### ${task.id}`,
        `archivo: ${task.fileLabel}`,
        `funcion: ${task.functionName}${task.className ? ` (class ${task.className})` : ''}`,
        `checks a aplicar: ${describeChecks(task.checks)}`,
        '```',
        task.code,
        '```',
    ].join('\n')).join('\n\n');

    const commentsSection = commentTasks
        .map(task => `${task.id} [${task.fileLabel}]: ${task.text}`)
        .join('\n');
    
    return [
        'Eres un revisor de estandares de codigo. Vas a revisar varias funciones y comentarios de un',
        'pull request en una sola pasada.',
        '',
        'Para cada funcion listada abajo, aplica UNICAMENTE los checks indicados en "checks a aplicar":',
        '- idioma_ingles: los identificadores (variables, parametros, metodos, clases, componentes, hooks)',
        ' deben estar en ingles, no es español. Ignora comentarios y strings mostrados al usuario.',
        ' Si el nombre del archivo esta en español, reportalo como "line":0 y "found" el nombre del archivo.',
        ' - coherencia_nombres: el nombre de la clase/funcion/variables debe escribir lo que realmente',
        ' hace o almacena. Si el nombre del archivo es claramente incoherente, reportalo con "line":0.',
        '- responsabilidad unica: la funcion debe hacer una sola cosa (maximo 1 violacion por funcion,',
        ' la linea donde empieza la responsabilidad que sobra).',
        '- complejidad: logica demasiado anidada o dificil de seguir (maximo 1 violacion por funcion,',
        ' la linea donde empieza el bloque mas complejo).',
        '',
        'Para los comentarios listados abajo (formato "<id> [archivo]: <texto>"), indica cuales NO estan',
        'escritos en español, ignorando termino tecnicos, nombres de variables/librerias, codigo y urls.',
        '',
        'Responde UNICAMENTE con JSON valido, sin texto adicional, con este formato exacto:',
        '{',
        '  "functions": [',
        '    { "id":"<id de la funcion>", "check":"idioma_ingles|coherencia_nombres|responsabilidad_unica|complejidad",',
        '      "line":<linea 1-indexed dentro del bloque, 0 si es el nombre del archivo>,',
        '      "found":"<identificador o texto encontrado>", "message":"<explicacion breve>" }',
        '  ],',
        '  "comments": [',
        '    { "id":"<id del comentario>", "message":"<explicacion breve>" }',
        '  ]',
        '}',
        'Si no hay violaciones, responde con los arreglos vacios.',
        '',
        '## Funciones a analizar',
        functionSection || '(ninguna)',
        '',
        '## Comentarios a analizar',
        commentsSection || '(ninguno)',
    ].join('\n');
}

//extrae el bloque JSON de la respuesta
function parseCombinedResponse(rawText: string): { functions: CombinedFunctionFinding[]; comments: CombinedCommentFinding[] } {
    try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        return {
            functions: Array.isArray(parsed.functions) ? parsed.functions : [],
            comments: Array.isArray(parsed.comments) ? parsed.comments : [],
        };
    } catch {
        return { functions: [], comments: [] };
    }
}

//convierte los hallazgos de funciones de vuelta a los mismos mensjes que generaban los analizadores separados
function applyFunctionFindings(
    functionFindings: CombinedFunctionFinding[],
    tasksById: Map<string, AiFunctionTask>,
    findings: string[]
): void {
    const fileNameReported = new Set<string>(); // clave: fileLabel + '|' + check, se reporta una vez por archivo
    const classNameReported = new Set<string>(); // clave: fileLabel + '|' + className

    for (const finding of functionFindings) {
        const task = tasksById.get(finding.id);
        if (!task) { continue; } //id  que no mandamos (alucinado), se descarta

        if (finding.line === 0) {
            const key = task.fileLabel + '|' + finding.check;
            if (fileNameReported.has(key)) { continue; }
            fileNameReported.add(key);

            if (finding.check === 'idioma_ingles') {
                findings.push(task.fileLabel + ' - El nombre del archivo "' + finding.found + '" esta en español, usa ingles (' + finding.message + ')');
            } else if (finding.check === 'coherencia_nombres') {
                findings.push(task.fileLabel + ' - El nombre del archivo "' + finding.found + '" no es coherente con su contenido (' + finding.message + ')');
            }
            continue;
        }

        const absoluteLine = task.startLine + finding.line - 1;

        switch (finding.check) {
            case 'idioma_ingles':
                findings.push(task.fileLabel + ':' + absoluteLine + ' - "' + finding.found + '" esta en español, usa ingles (' + finding.message + ')');
                break;

            case 'coherencia_nombres': {
                const isClassViolation = task.className !== null && finding.found === task.className;
                if (isClassViolation) {
                    const key = task.fileLabel + '|' + task.className;
                    if (classNameReported.has(key)) { continue; }
                    classNameReported.add(key);
                }
                findings.push(task.fileLabel + ':' + absoluteLine + ' - "' + finding.found + '" no es un nombre coherente con lo que hace (' + finding.message + ')');
                break;
            }

            case 'responsabilidad_unica':
                findings.push(task.fileLabel + ':' + absoluteLine + ' - La funcion "' + task.functionName + '" hace mas de una cosa: ' + finding.found + ' (' + finding.message + ')');
                break;

            case 'complejidad':
                findings.push(task.fileLabel + ':' + absoluteLine + ' - La funcion "' + task.functionName + '" tiene logica demasiado compleja: ' + finding.found + ' (' + finding.message + ')');
                break;
        }
    }
}

function applyCommentFindings(
    commentFindings: CombinedCommentFinding[],
    tasksById: Map<string, AiCommentTask>,
    findings: string[]
): void {
    for (const finding of commentFindings) {
        const task = tasksById.get(finding.id);
        if (!task) { continue; }
        findings.push(task.fileLabel + ':' + task.line + ' - El comentario "' + task.text + '" no esta en español, usa español (' + finding.message + ')'); 
    }
}

export async function runCombinedAiReview(
    functionTasks: AiFunctionTask[],
    commentTask: AiCommentTask[],
    findings: string[],
    config: AiReviewConfig
): Promise<void> {
    if (functionTasks.length === 0 && commentTask.length === 0) { return; }

    const functionTaskById = new Map(functionTasks.map(task => [task.id, task]));
    const commentTaskById = new Map(commentTask.map(task => [task.id, task]));
    const prompt = buildCombinedPrompt(functionTasks, commentTask);

    try {
        const responseText = await callClaude(prompt, { model: config.model, maxTokens: config.maxTokens });
        const parsed = parseCombinedResponse(responseText);
        applyFunctionFindings(parsed.functions, functionTaskById, findings);
        applyCommentFindings(parsed.comments, commentTaskById, findings);
    } catch (error) {
        findings.push('No se pudo ejecutar el analisis de IA combinado (' + (error as Error).message + ')');
    }
}

export { MIN_FUNCTION_LINES };