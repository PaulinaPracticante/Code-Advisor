// ---------------------------------------------------------------------------------------
// ---- PRINCIPIOS SOLID PARA FRONTEND POR IA: S Y O -------------------------------------
// ---------------------------------------------------------------------------------------

import { callClaude } from "../../shared/claudeClient";
import { fileExportsComponent } from "../../shared/componentDetection";
import { SolidFrontendAiConfig } from "../../config/configLoader";
import { Finding, pushFinding } from "../../shared/finding";

const COMPONENT_EXTENSION_PATTERN = /\.(jsx|tsx|js|ts)$/;
const TEST_FILE_PATTERN = /\.(test|spec|stories)\.(jsx|tsx|js|ts)$/;
const MIN_COMPONENT_LINES = 15;

export interface SolidFrontendTask {
    id: string;
    fileLabel: string;
    componentName: string;
    startLine: number;
    code: string;
}

type SolidCheckName = 'responsabilidad_unica' | 'abierto_cerrado';

interface SolidFrontendFinding {
    id: string;
    check: SolidCheckName;
    line: number;
    found: string;
    message: string;
    suggestion?: string;
}

//mismo criterio que componentLocationAnalyzer para detectar un componente de react 
function isFrontendComponentFile(lines: string[], fileLabel: string): boolean {
    if (!COMPONENT_EXTENSION_PATTERN.test(fileLabel) || TEST_FILE_PATTERN.test(fileLabel)) { return false; }
    return fileExportsComponent(lines);
}

//arma la tarea del componente que cambio en el PR
//el id es un identificador corto y opaco (no el nombre del archivo ni del componente) para que
//la IA no lo confunda con el campo "componente:" del prompt y lo devuelva mal en la respuesta
export function collectSolidFrontendTask(lines: string[], fileLabel: string, changedLines: Set<number>, id: string): SolidFrontendTask | null {
    if (!isFrontendComponentFile(lines, fileLabel)) { return null; }
    if (changedLines.size === 0) { return null; }
    if (lines.length < MIN_COMPONENT_LINES) { return null; }

    return {
        id,
        fileLabel,
        componentName: fileLabel.split('/').pop()?.split('.')[0] ?? fileLabel,
        startLine: 1,
        code: lines.join('\n'),
    };
}

//prompt unico con todos los componentes acumulados durante el PR
function buildPrompt(tasks: SolidFrontendTask[]): string {
    const section = tasks.map(task => [
        `### ${task.id}`,
        `archivo: ${task.fileLabel}`,
        `componente: ${task.componentName}`,
        '```',
        task.code,
        '```',
    ].join('\n')).join('\n\n');

    return [
        'Eres un revisor de estandares de codigo frontend (React). Vas a revisar varios componentes',
        'de un pull request en una sola pasada, buscando SOLO estos dos principios:',
        '',
        '- responsabilidad_unica (S): el componente mezcla fetching de datos, logica de negocio',
        ' (transformaciones, validaciones, calculos) y renderizado, todo en el mismo archivo,',
        ' en vez de delegar en un hook personalizado o un servicio aparte. ',
        '- abierto_cerrado (O): el componente decide que renderizar con un switch/if-else largo',
        ' sobre un "tipo"/"kind", de forma que agregar un caso nuevo obliga a modificar el', 
        ' componente en vez de extenderlo por composicion o un mapa de componentes.',
        '',
        'Reporta como maximo 1 violacion de cada principio por componente (la linea donde',
        'empieza el problema).',
        '',
        'Responde UNICAMENTE con JSON valido, sin texto adicional, con este formato exacto.',
        'El "id" debe ser EXACTAMENTE el texto que aparece despues de "### " de cada componente,',
        'no el nombre del componente ni el del archivo:',
        '{"violations":[{"id":"<id del componente>", "check":"responsabilidad_unica|abierto_cerrado",',
        '"line":<linea 1-indexed dentro del archivo>, "found":"<que se encontro>",',
        '"message":"<como separarlo/extenderlo>", "suggestion":"<correccion concreta y breve, en español>"}]}',
        'Si no hay violaciones responde {"violations":[]}.',
        '',
        '### Componentes a analizar',
        section,
    ].join('\n');
}

//extrae el bloque JSON de la respuesta 
function parseResponse(rawText: string): SolidFrontendFinding[] {
    try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        return Array.isArray(parsed.violations) ? parsed.violations : []; 
    } catch {
        return [];
    }
}

export async function runSolidFrontendReview(
    tasks: SolidFrontendTask[],
    findings: Finding[],
    config: SolidFrontendAiConfig
): Promise<void> {
    if (tasks.length === 0) { return; }

    const tasksById = new Map(tasks.map(task => [task.id, task]));

    try {
        const prompt = buildPrompt(tasks);
        const responseText = await callClaude(prompt, { model: config.model, maxTokens: config.maxTokens });

        for (const violation of parseResponse(responseText)) {
            const task = tasksById.get(violation.id);
            if (!task || typeof violation.line !== 'number') { continue; }

            const absoluteLine = task.startLine + violation.line - 1;
            const label = violation.check === 'abierto_cerrado' ? 'OCP' : 'SRP';
            pushFinding(findings, 'solidFrontendAi', task.fileLabel,
                '[' + label + '] El componente "' + task.componentName + '": ' + violation.found + ' (' + violation.message + ')',
                { line: absoluteLine, suggestion: violation.suggestion }
            );
        }
    } catch (error) {
        pushFinding(findings, 'solidFrontendAi', 'IA', 'No se pudo ejecutar el analisis SOLID de frontend (' + (error as Error).message + ')');
    }
}