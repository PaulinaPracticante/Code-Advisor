import * as vscode from 'vscode';
import { loadConfig } from '../engine/config/configLoader';
import { detectProjectMeta } from '../engine/shared/projectProfile';
import { getChangedLineNumbers } from '../engine/shared/diffUtils';
import { Finding } from '../engine/shared/finding';
import { updateDecorations } from './decorations';
import { publishDiagnostics } from './diagnostics';
import { FindingsPanel } from './findingsPanel';
import { analyzeFileStatic } from './commands/codeReviewerCommand';

// reglas que vienen de la IA, no se pueden re-chequear sin otra llamada, se dejan igual hasta el proximo commit
const AI_RULES = new Set([
    'englishOnly', 'semanticNaming', 'singleResponsibility', 'codeComplexity',
    'projectGuidelines', 'commentLenguage', 'aiReview', 'solidFrontendAi',
]);
// reglas que miran todo el proyecto, no se pueden recalcular viendo un solo archivo
const PROJECT_WIDE_RULES = new Set(['interfaces', 'layers', 'duplicateCode', 'folderNaming', 'commitMessage']);

//al guardar un archivo, vuelve a correr solo las reglas estaticas de ese archivo y las quita del panel
//decoraciones los hallazgos que ya no aparecen; los de IA y los de todo el proyecto se quedan igual
export function registerSaveWatcher(
    context: vscode.ExtensionContext,
    diagnosticCollection: vscode.DiagnosticCollection,
    findingsPanel: FindingsPanel
): void {
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async document => {
            const folder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (!folder) { return; }

            const current = findingsPanel.getCurrentState();
            if (!current || current.folder.uri.toString() !== folder.uri.toString()) { return; }

            const fileLabel = vscode.workspace.asRelativePath(document.uri);
            const hasStaticFindings = current.findings.some(f =>
                f.file === fileLabel && !AI_RULES.has(f.rule) && !PROJECT_WIDE_RULES.has(f.rule));
            if (!hasStaticFindings) { return; } // nada que re-chequear en este archivo

            const config = await loadConfig(folder.uri);
            const projectMeta = await detectProjectMeta(folder.uri);
            const baseBranch = vscode.workspace.getConfiguration('codeadvisor').get<string>('baseBranch', 'main');

            const lines = document.getText().split('\n');
            const changedLines = getChangedLineNumbers(folder.uri.fsPath, `origin/${baseBranch}`, fileLabel);

            const freshForFile: Finding[] = [];
            analyzeFileStatic(lines, fileLabel, folder.name, changedLines, config, projectMeta, freshForFile);

            const merged = [
                ...current.findings.filter(f => f.file !== fileLabel || AI_RULES.has(f.rule) || PROJECT_WIDE_RULES.has(f.rule)),
                ...freshForFile,
            ];

            findingsPanel.update(folder, merged, current.branch ?? '', current.commit ?? '');
            publishDiagnostics(diagnosticCollection, folder, merged);
            updateDecorations(merged);
        })
    );
}
