// ---------------------------------------------------------------------------------------
// ----- REVISION COMBINADA DE IA: INGLES, COHERENCIA DE NOMBRES, RESPONSABILIDAD UNICA, -
// ----- COMPLEJIDAD Y COMENTARIOS EN UNA SOLA LLAMADA A LA IA POR EJECUCION DE COMANDO --

import { callClaude } from "../../shared/claudeClient";
import { Finding, pushFinding } from "../../shared/finding";

const MIN_FUNCTION_LINES = 5;

export interface AiFunctionChecks {
    english: boolean;
    semantic: boolean;
    singleResponsability: boolean;
    complexity: boolean;
    guidelines: boolean;
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

type FunctionCheckName = 'idioma_ingles' | 'coherencia_nombres' | 'responsabilidad_unica' | 'complejidad' | 'guia_proyecto';

// a que regla de RULE_PRIORITIES corresponde cada check, para etiquetar la prioridad del hallazgo
const CHECK_TO_RULE: Record<FunctionCheckName, string> = {
    idioma_ingles: 'englishOnly',
    coherencia_nombres: 'semanticNaming',
    responsabilidad_unica: 'singleResponsibility',
    complejidad: 'codeComplexity',
    guia_proyecto: 'projectGuidelines'
};

interface CombinedFunctionFinding {
    id: string;
    check: FunctionCheckName;
    line: number;
    found: string;
    message: string;
    regla?: string | number; // solo en guia_proyecto: numero o titulo de la regla violada
    suggestion?: string;
}

interface CombinedCommentFinding {
    id: string;
    message: string;
    suggestion?: string;
}

// arma la lista de checks en español para avisarle a la ia cuales aplicar cada funcion
function describeChecks(checks: AiFunctionChecks): string {
    return [
        checks.english ? 'idioma_ingles' : null,
        checks.semantic ? 'coherencia_nombres' : null,
        checks.singleResponsability ? 'responsabilidad_unica' : null,
        checks.complexity ? 'complejidad' : null,
        checks.guidelines ? 'guia_proyecto' : null,
    ].filter(Boolean).join(', ');
}

// arma un prompt uncio con todas las funciones y comentarios del PR
function buildCombinedPrompt(functionTasks: AiFunctionTask[], commentTasks: AiCommentTask[], hasGuidelines: boolean): string {
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

    // solo existe cuando hay guia (se inserta junto a los demas checks, antes del formato de salida); sin guia
    // el prompt queda igual que siempre
    const guidelinesInstruction = hasGuidelines
        ? [
            '- guia_proyecto: ademas de los checks anteriores, evalua cada funcion contra las reglas del',
            ' proyecto que recibiste en el contexto (system). Reporta cada violacion encontrada: maximo 1',
            ' violacion por regla por funcion (la linea donde ocurre); si la funcion viola varias reglas,',
            ' reporta cada una como un hallazgo aparte. En "regla" indica el numero o titulo de la regla violada.',
            ' No reportes codigo que cumple la regla, ni menciones de la regla en comentarios o cadenas de texto.',
        ].join('\n')
        : null;
    
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
        guidelinesInstruction,
        '',
        'Para los comentarios listados abajo (formato "<id> [archivo]: <texto>"), indica cuales NO estan',
        'escritos en español, ignorando termino tecnicos, nombres de variables/librerias, codigo y urls.',
        '',
        'Responde UNICAMENTE con JSON valido, sin texto adicional, con este formato exacto:',
        '{',
        '  "functions": [',
        '    { "id":"<id de la funcion>", "check":"idioma_ingles|coherencia_nombres|responsabilidad_unica|complejidad' + (hasGuidelines ? '|guia_proyecto' : '') + '",',
        hasGuidelines ? '      "regla":"<numero o titulo de la regla de la guia que se viola; solo para guia_proyecto>",' : null,
        '      "line":<linea 1-indexed dentro del bloque, 0 si es el nombre del archivo>,',
        '      "found":"<identificador o texto encontrado>", "message":"<explicacion breve>" }',
        '      "suggestion":"<correccion concreta y breve, en español>" }',
        '  ],',
        '  "comments": [',
        '    { "id":"<id del comentario>", "message":"<explicacion breve>", "suggestion":"<correcttion concreta y breve, en español>" }',
        '  ]',
        '}',
        'Si no hay violaciones, responde con los arreglos vacios.',
        '',
        '## Funciones a analizar',
        functionSection || '(ninguna)',
        '',
        '## Comentarios a analizar',
        commentsSection || '(ninguno)',
    ].filter((line): line is string => line !== null).join('\n');
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

// identifica la regla de la guia que se violo: el numero si lo trae ("Regla 3", "3. ..."), si no el texto
function guidelineRuleKey(finding: CombinedFunctionFinding): string {
    const rule = finding.regla !== undefined && finding.regla !== null ? String(finding.regla).trim() : '';
    if (rule) {
        const ruleNumber = rule.match(/\d+/);
        return ruleNumber ? ruleNumber[0] : rule.toLowerCase();
    }
    return 'found:' + String(finding.found).trim().toLowerCase();
}

// antepone "Regla N: " al mensaje cuando la IA mando la regla aparte y el mensaje no la menciona
function guidelineMessage(finding: CombinedFunctionFinding): string {
    const rule = finding.regla !== undefined && finding.regla !== null ? String(finding.regla).trim().replace(/^regla\s*/i, '') : '';
    if (!rule || /^regla\s*\d/i.test(finding.message)) { return finding.message; }
    return (/^\d+$/.test(rule) ? 'Regla ' + rule : 'Regla "' + rule + '"') + ': ' + finding.message;
}

//convierte los hallazgos de funciones de vuelta a los mismos mensjes que generaban los analizadores separados
function applyFunctionFindings(
    functionFindings: CombinedFunctionFinding[],
    tasksById: Map<string, AiFunctionTask>,
    findings: Finding[]
): void {
    const fileNameReported = new Set<string>(); // clave: fileLabel + '|' + check, se reporta una vez por archivo
    const classNameReported = new Set<string>(); // clave: fileLabel + '|' + className
    const guidelineReported = new Set<string>(); // clave: fileLabel + '|' + linea + '|' + regla (funciones anidadas repiten el hallazgo)

    for (const finding of functionFindings) {
        const task = tasksById.get(finding.id);
        if (!task) { continue; } //id  que no mandamos (alucinado), se descarta

        if (finding.line === 0) {
            const key = task.fileLabel + '|' + finding.check;
            if (fileNameReported.has(key)) { continue; }
            fileNameReported.add(key);

            if (finding.check === 'idioma_ingles') {
                pushFinding(findings, CHECK_TO_RULE[finding.check], task.fileLabel,
                    `El nombre del archivo "${finding.found}" esta en español, usa ingles (${finding.message})`,
                    { suggestion: finding.suggestion });
            } else if (finding.check === 'coherencia_nombres') {
                pushFinding(findings, CHECK_TO_RULE[finding.check], task.fileLabel,
                    `El nombre del archivo "${finding.found}" no es coherente con su contenido (${finding.message})`,
                    { suggestion: finding.suggestion});
                
            }
            continue;
        }

        const absoluteLine = task.startLine + finding.line - 1;

        switch (finding.check) {
            case 'idioma_ingles':
                pushFinding(findings, CHECK_TO_RULE[finding.check], task.fileLabel,
                    `"${finding.found}" esta en español, usa ingles (${finding.message})`,
                    { line: absoluteLine, suggestion: finding.suggestion});
                break;

            case 'coherencia_nombres': {
                const isClassViolation = task.className !== null && finding.found === task.className;
                if (isClassViolation) {
                    const key = task.fileLabel + '|' + task.className;
                    if (classNameReported.has(key)) { continue; }
                    classNameReported.add(key);
                }
                pushFinding(findings, CHECK_TO_RULE[finding.check], task.fileLabel,
                    `"${finding.found}" no es un nombre coherente con lo que hace (${finding.message})`,
                    { line: absoluteLine, suggestion: finding.suggestion});
                break;
            }

            case 'responsabilidad_unica':
                pushFinding(findings, CHECK_TO_RULE[finding.check], task.fileLabel,
                    `La funcion "${task.functionName}" hace mas de una cosa: ${finding.found} (${finding.message})`,
                    { line: absoluteLine, suggestion: finding.suggestion });
                break;

            case 'complejidad':
                pushFinding(findings, CHECK_TO_RULE[finding.check], task.fileLabel,
                    `La funcion "${task.functionName}" tiene logica demasiado compleja: ${finding.found} (${finding.message})`,
                    { line: absoluteLine, suggestion: finding.suggestion});
                break;

            case 'guia_proyecto': {
                const key = task.fileLabel + '|' + absoluteLine + '|' + guidelineRuleKey(finding);
                if (guidelineReported.has(key)) { continue; }
                guidelineReported.add(key);
                pushFinding(findings, CHECK_TO_RULE[finding.check], task.fileLabel,
                    `Viola la guia del proyecto: ${finding.found} (${guidelineMessage(finding)})`,
                    { line: absoluteLine, suggestion: finding.suggestion });
                break;
            }
        }
    }
}

function applyCommentFindings(
    commentFindings: CombinedCommentFinding[],
    tasksById: Map<string, AiCommentTask>,
    findings: Finding[]
): void {
    for (const finding of commentFindings) {
        const task = tasksById.get(finding.id);
        if (!task) { continue; }
        pushFinding(findings, 'commentLenguage', task.fileLabel,
            `El comentario "${task.text}" no esta en español, usa español (${finding.message})`,
            { line: task.line, suggestion: finding.suggestion });
    }
}

export async function runCombinedAiReview(
    functionTasks: AiFunctionTask[],
    commentTask: AiCommentTask[],
    findings: Finding[],
    config: AiReviewConfig,
    guidelines: string | null
): Promise<void> {
    if (functionTasks.length === 0 && commentTask.length === 0) { return; }

    const functionTaskById = new Map(functionTasks.map(task => [task.id, task]));
    const commentTaskById = new Map(commentTask.map(task => [task.id, task]));
    const prompt = buildCombinedPrompt(functionTasks, commentTask, guidelines !== null);

    try {
        const responseText = await callClaude(prompt, { model: config.model, maxTokens: config.maxTokens, system: guidelines ?? undefined, });
        const parsed = parseCombinedResponse(responseText);
        applyFunctionFindings(parsed.functions, functionTaskById, findings);
        applyCommentFindings(parsed.comments, commentTaskById, findings);
    } catch (error) {
        pushFinding(findings, 'aiReview', '(sistema)', 'No se pudo ejecutar el analisis de IA combinado (' + (error as Error).message + ')');
    }
}

export { MIN_FUNCTION_LINES };