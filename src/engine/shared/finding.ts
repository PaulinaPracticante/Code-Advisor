import { getRulePriority } from '../config/configLoader';

export type Severity = 'Alta' | 'Media' | 'Baja';

export interface Finding {
    file: string; //ruta de carpeta relativa
    line?: number; //numero de linea 
    rule: string;
    severity: Severity;
    message: string; //lo que va despues del - 
    suggestion?: string; //recomendacion de la solucion 
}

function findingKey(finding: Finding): string {
    if (finding.line !== undefined) {
        return `${finding.file}|${finding.line}|${finding.rule}`;
    }
    return `${finding.file}|${finding.rule}|${finding.message}`;
}

export function mergeFindings(accumulated: Finding[], current: Finding[]): Finding[] {
    const merged = [...accumulated];
    const seen = new Set(accumulated.map(findingKey));

    for(const finding of current) {
        const key = findingKey(finding);
        if (seen.has(key)) { continue; }
        seen.add(key);
        merged.push(finding);
    }
    return merged;
}

export function pushFinding(
    findings: Finding[],
    rule: string,
    file: string,
    message: string,
    options?: { line?: number; suggestion?: string }
): void {
    findings.push({
        file,
        line: options?.line,
        rule,
        severity: getRulePriority(rule) ?? 'Media',
        message,
        suggestion: options?.suggestion,
    });
}