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