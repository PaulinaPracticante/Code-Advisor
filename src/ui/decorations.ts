// ----------------------------------------------------------------------------------------------------------------
// ---- DIBUJA LOS AVISOS INLINE EN EL EDITOR ---------------------------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------

import * as vscode from 'vscode';
import { Finding, Severity } from '../engine/shared/finding';

//se define por cada severidad el color 
const SEVERITY_STYLE: Record<Severity, { background: string; overviewTuler: string; textColor: string }> = {
    Alta: { background: 'rgba(255, 90, 90, 0.15)', overviewTuler: 'rgba(255,90, 90, 0.8)', textColor: '#ff8080' },
    Media: { background: 'rgba(255, 200, 60, 0.12)', overviewTuler: 'rgba(255, 200, 60, 0.8)', textColor: '#e0b03a' },
    Baja: { background: 'rgba(100, 180, 255, 0.10)', overviewTuler: 'rgba(100, 180, 255, 0.8)', textColor: '#6fa8dc'},
};

//crea un TextEditorDecorationType, resalta toda liena del codigo
function makeDecorationType(style: typeof SEVERITY_STYLE['Alta']): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: style.background, //color de fondo
        overviewRulerColor: style.overviewTuler, 
        overviewRulerLane: vscode.OverviewRulerLane.Right, //marca el overview ruler a la derecha 
        after: {
            color: style.textColor,
            fontStyle: 'italic',
            margin: '0 0 0 1rem',
        },
    });
}

//instancia de decoracion por cada severidad
const DECORATION_TYPE: Record<Severity, vscode.TextEditorDecorationType> = {
    Alta: makeDecorationType(SEVERITY_STYLE.Alta),
    Media: makeDecorationType(SEVERITY_STYLE.Media),
    Baja: makeDecorationType(SEVERITY_STYLE.Baja),
};

let lastFindingsByFile = new Map<string, Finding[]>(); //guarda por archivo la lista de findings 

//funcion principal
export function updateDecorations(findings: Finding[]): void {
    lastFindingsByFile =  new Map(); //agrupa los findings por archivo 
    for (const finding of findings) {
        if (finding.line === undefined) { continue; }
        const list = lastFindingsByFile.get(finding.file) ?? [];
        list.push(finding);
        lastFindingsByFile.set(finding.file, list);
    }
    //aplica las decoraciones a todos los editores visibles
    vscode.window.visibleTextEditors.forEach(applyDecorationsToEditor); 
}

//funcion para cortar mensaje en la linea 
function truncate(text: string, max: number): string {
    //si el texto supera max caracteres, lo corta y agrega ...
    return text.length > max ? text.slice(0, max).trimEnd() + '...' : text; 
}

function applyDecorationsToEditor(editor: vscode.TextEditor): void {
    const fileLabel = vscode.workspace.asRelativePath(editor.document.uri, false); //calcula la ruta relativa del archivo
    const findings = lastFindingsByFile.get(fileLabel) ?? [];

    //prepara un objeto donde va acomulando por severidad las opciones de decoracion 
    const optionsBySeverity: Record<Severity, vscode.DecorationOptions[]> = { Alta: [], Media: [], Baja: [] };

    //por cada finding
    for (const finding of findings) {
        const line = finding.line! - 1;
        //si la linea queda fuera de rango del documento actual la descarta 
        if (line < 0 || line >= editor.document.lineCount) { continue; }

        //si es valida arma la decoracion
        optionsBySeverity[finding.severity].push({
            range: editor.document.lineAt(line).range,
            renderOptions: { after: {contentText: ' ⚠ ' + truncate(finding.message, 45) } },
            hoverMessage: finding.suggestion 
                ? ` ${finding.message}\n\n ${finding.suggestion}`  
                : finding.message,
        });
    }

    (Object.keys(DECORATION_TYPE) as Severity[]). forEach(severity => {
        editor.setDecorations(DECORATION_TYPE[severity], optionsBySeverity[severity]);
    });
}

//llama para activar la extension
export function registerDecorationRefresh(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.window.onDidChangeVisibleTextEditors(editors => editors.forEach(applyDecorationsToEditor)),
        ...Object.values(DECORATION_TYPE),
    );
}