// --------------------------------------------------------------------------------------
// ---- DE FINDINGS A "PROBLEMS" --------------------------------------------------------
// --------------------------------------------------------------------------------------

import * as vscode from 'vscode';
import { Finding, Severity } from '../engine/shared/finding';

//traduce la severidad propia del dominio 
const SEVERITY_MAP: Record<Severity, vscode.DiagnosticSeverity> = {
    Alta: vscode.DiagnosticSeverity.Error,
    Media: vscode.DiagnosticSeverity.Warning,
    Baja: vscode.DiagnosticSeverity.Information,
};

//algunos hallazgos no apuntan a un archivo real , por el momento se quedan en el .txt y en el panel
function hasRealFile(finding: Finding): boolean {
    return !finding.file.startsWith('(') && !finding.file.endsWith('/');
}

//funcion principal
export function publishDiagnostics(
    diagnosticsCollection: vscode.DiagnosticCollection,
    folder: vscode.WorkspaceFolder,
    findings: Finding[]
): void {
    diagnosticsCollection.clear(); //limpia hallazgos del analisis anterior

    const byFile = new Map<string, vscode.Diagnostic[]>();

    for(const finding of findings) {
        if (!hasRealFile(finding)) { continue; } //descarta los que no tienen un archivo real

        const line = finding.line !== undefined ? finding.line -1 : 0; //calcula la linea 
        const range = new vscode.Range(line, 0, line, 1000); //columna grande, vscode la recorta visualmente

        //arma el mensaje
        const message = finding.suggestion
            ? `${finding.message}\n ${finding.suggestion}`
            : finding.message;

            //crea un diagnostico con rango, mensaje y severidad mapeada 
        const diagnostic = new vscode.Diagnostic(range, message, SEVERITY_MAP[finding.severity]);
        diagnostic.source = 'CodeAdvisor';
        diagnostic.code =  finding.rule;

        const list = byFile.get(finding.file) ?? []; //lo agrega a la lista correspondiente 
        list.push(diagnostic);
        byFile.set(finding.file, list);
    }

    for (const [fileLabel, diagnostic] of byFile) {
        const uri = vscode.Uri.joinPath(folder.uri, fileLabel);
        diagnosticsCollection.set(uri, diagnostic);
    }
}