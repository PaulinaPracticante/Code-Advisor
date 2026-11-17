// ----------------------------------------------------------------------------------------------------
// ---- LO QUE SE GUARDA EN EL HISTORIAL: UN ANALISIS POR COMMIT Y EL CIERRE DE CADA PR ---------------
// ----------------------------------------------------------------------------------------------------

import * as crypto from 'crypto';
import type { Finding, Severity } from '../shared/finding';

export interface HistoryRepo {
    name: string; //nombre del repo, sale de la direccion del origin
    remoteUrl: string; //direccion del origin sin usuario ni contrasena
}

export interface HistoryFinding {
    fingerprint: string; //identifica al hallazgo aunque cambie de linea
    file: string;
    line: number | null;
    rule: string;
    severity: Severity;
    message: string;
    suggestion: string | null;
}

//un commit analizado con los hallazgos que mostraba el panel en ese momento
export interface AnalysisRecord {
    repo: HistoryRepo;
    branch: string;
    commit: { hash: string; subject: string; authorName: string; authorEmail: string };
    analyzedAt: string;
    extensionVersion: string;
    findings: HistoryFinding[];
}

//aviso de que el PR de una rama se mergeo, lastCommit es el ultimo commit analizado de esa rama
export interface PullRequestClosure {
    repo: HistoryRepo;
    branch: string;
    lastCommit: string;
    mergedAt: string;
}

function compare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

//convierte los hallazgos del panel al formato del historial y les pone su huella (fingerprint).
//La huella no usa la linea, asi el hallazgo sigue siendo el mismo aunque se muevan lineas arriba de el.
//Los que repiten archivo, regla y mensaje (ej. cada linea con espacios en la identacion) se distinguen por su orden en el archivo.
export function buildHistoryFindings(findings: Finding[]): HistoryFinding[] {
    const ordered = [...findings].sort((a, b) =>
        compare(a.file, b.file) || compare(a.rule, b.rule) || compare(a.message, b.message) || (a.line ?? -1) - (b.line ?? -1)
    );

    const occurrences = new Map<string, number>();
    return ordered.map(finding => {
        const identity = [finding.rule, finding.file, finding.message].join('|');
        const occurrence = (occurrences.get(identity) ?? 0) + 1;
        occurrences.set(identity, occurrence);

        return {
            fingerprint: crypto.createHash('sha256').update(identity + '|' + occurrence).digest('hex'),
            file: finding.file,
            line: finding.line ?? null,
            rule: finding.rule,
            severity: finding.severity,
            message: finding.message,
            suggestion: finding.suggestion ?? null,
        };
    });
}
