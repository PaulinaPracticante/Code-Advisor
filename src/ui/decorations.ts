// ----------------------------------------------------------------------------------------------------------------
// ---- DIBUJA LOS AVISOS INLINE EN EL EDITOR ---------------------------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------

import * as vscode from 'vscode';
import { Finding, Severity } from '../engine/shared/finding';

//se define por cada severidad cuanto se ve en el editor, solo la prioridad Alta resalta toda la linea con fondo
//Media y Baja solo marcan la barra derecha, y el texto del aviso (textColor) es mas tenue mientras menos prioridad tenga
const SEVERITY_STYLE: Record<Severity, { background?: string; overviewTuler: string; textColor: string }> = {
    Alta: { background: 'rgba(255, 90, 90, 0.15)', overviewTuler: 'rgba(255,90, 90, 0.8)', textColor: '#ff8080' },
    Media: { overviewTuler: 'rgba(255, 200, 60, 0.8)', textColor: 'rgba(224, 176, 58, 0.8)' },
    Baja: { overviewTuler: 'rgba(100, 180, 255, 0.35)', textColor: 'rgba(111, 168, 220, 0.6)' },
};

//crea un TextEditorDecorationType que marca la linea del codigo (fondo solo en Alta) y la barra derecha, sin escribir texto
function makeLineDecorationType(style: typeof SEVERITY_STYLE['Alta']): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: style.background, //color de fondo, solo lo tiene la prioridad Alta
        overviewRulerColor: style.overviewTuler,
        overviewRulerLane: vscode.OverviewRulerLane.Right, //marca el overview ruler a la derecha
    });
}

//crea un TextEditorDecorationType con el texto del aviso al final de la linea
function makeInlineDecorationType(style: typeof SEVERITY_STYLE['Alta']): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
        after: {
            color: style.textColor,
            fontStyle: 'italic',
            margin: '0 0 0 1rem',
        },
    });
}

//instancias de decoracion por cada severidad, una para marcar la linea y otra para el texto
const LINE_DECORATION_TYPE: Record<Severity, vscode.TextEditorDecorationType> = {
    Alta: makeLineDecorationType(SEVERITY_STYLE.Alta),
    Media: makeLineDecorationType(SEVERITY_STYLE.Media),
    Baja: makeLineDecorationType(SEVERITY_STYLE.Baja),
};
const INLINE_DECORATION_TYPE: Record<Severity, vscode.TextEditorDecorationType> = {
    Alta: makeInlineDecorationType(SEVERITY_STYLE.Alta),
    Media: makeInlineDecorationType(SEVERITY_STYLE.Media),
    Baja: makeInlineDecorationType(SEVERITY_STYLE.Baja),
};

let lastFindingsByFile = new Map<string, Finding[]>(); //guarda por archivo la lista de findings
const lastCursorLines = new WeakMap<vscode.TextEditor, string>(); //lineas donde estaba el cursor cuando se pintaron los avisos de cada editor

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

//lineas (0-indexadas) donde esta el cursor, son varias si el usuario usa multicursor
function getCursorLines(editor: vscode.TextEditor): number[] {
    return editor.selections.map(selection => selection.active.line);
}

function applyDecorationsToEditor(editor: vscode.TextEditor): void {
    const fileLabel = vscode.workspace.asRelativePath(editor.document.uri, false); //calcula la ruta relativa del archivo
    const findings = lastFindingsByFile.get(fileLabel) ?? [];
    const cursorLines = getCursorLines(editor);
    lastCursorLines.set(editor, cursorLines.join(',')); //se guarda para no repintar si el cursor sigue en la misma linea

    //prepara dos objetos donde va acomulando por severidad las opciones de decoracion, las de la linea y las del texto
    const lineOptions: Record<Severity, vscode.DecorationOptions[]> = { Alta: [], Media: [], Baja: [] };
    const inlineOptions: Record<Severity, vscode.DecorationOptions[]> = { Alta: [], Media: [], Baja: [] };

    //por cada finding
    for (const finding of findings) {
        const line = finding.line! - 1;
        //si la linea queda fuera de rango del documento actual la descarta
        if (line < 0 || line >= editor.document.lineCount) { continue; }

        //si es valida arma la decoracion de la linea
        const range = editor.document.lineAt(line).range;
        lineOptions[finding.severity].push({
            range,
            hoverMessage: finding.suggestion
                ? ` ${finding.message}\n\n ${finding.suggestion}`
                : finding.message,
        });

        //el texto del aviso solo se escribe en la linea donde esta el cursor para no llenar el editor de mensajes
        if (cursorLines.includes(line)) {
            inlineOptions[finding.severity].push({
                range,
                renderOptions: { after: {contentText: ' ⚠ ' + truncate(finding.message, 45) } },
            });
        }
    }

    (Object.keys(LINE_DECORATION_TYPE) as Severity[]). forEach(severity => {
        editor.setDecorations(LINE_DECORATION_TYPE[severity], lineOptions[severity]);
        editor.setDecorations(INLINE_DECORATION_TYPE[severity], inlineOptions[severity]);
    });
}

//llama para activar la extension
export function registerDecorationRefresh(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.window.onDidChangeVisibleTextEditors(editors => editors.forEach(applyDecorationsToEditor)),
        //cuando el cursor cambia de linea se mueve el texto del aviso a la linea nueva
        vscode.window.onDidChangeTextEditorSelection(event => {
            const editor = event.textEditor;
            const fileLabel = vscode.workspace.asRelativePath(editor.document.uri, false);
            if (!lastFindingsByFile.has(fileLabel)) { return; } //el archivo no tiene hallazgos, no hay nada que repintar
            if (lastCursorLines.get(editor) === getCursorLines(editor).join(',')) { return; } //el cursor sigue en la misma linea
            applyDecorationsToEditor(editor);
        }),
        ...Object.values(LINE_DECORATION_TYPE),
        ...Object.values(INLINE_DECORATION_TYPE),
    );
}
