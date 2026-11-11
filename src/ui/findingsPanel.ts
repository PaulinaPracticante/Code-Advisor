// --------------------------------------------------------------------------------------------------
// ---- PANEL LATERAL -------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------

import * as vscode from 'vscode';
import { Finding, Severity } from '../engine/shared/finding';

const FINDINGS_STATE_KEY = 'codeadvisor.lastFindings';

interface PersistedFindings {
    folderUri: string;
    commit: string;
    findings: Finding[];
}

//Genera strig aleatorio de 32 caracteres
function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) { text += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return text;
}

//orden en que se muestran las prioridades en el panel, de la mas importante a la menos
const SEVERITY_ORDER: Record<Severity, number> = { Alta: 0, Media: 1, Baja: 2 };

//ordena los hallazgos por prioridad y luego por regla, archivo y linea, asi el panel puede agruparlos por regla
function sortFindings(findings: Finding[]): Finding[] {
    return [...findings].sort((a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        a.rule.localeCompare(b.rule) ||
        a.file.localeCompare(b.file) ||
        (a.line ?? 0) - (b.line ?? 0)
    );
}

//implementa la interfaz que vscode requiere para proveer contenido a una vista resgistrada
export class FindingsPanel implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeadvisor.findingsView';

    private view?: vscode.WebviewView; //referencia al webview
    private findings: Finding[] = []; //la ultima lista de hallazgos, ya ordenada
    private folder?: vscode.WorkspaceFolder; //folder actual

    //llama a este metodo cuando el usuario abre el panel por primera vez y cada vez que lo vuelve a mostrar
    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView; //guarda al referencia de webview
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtml(webviewView.webview); //inyecta el html

        webviewView.webview.onDidReceiveMessage(message => {
            //los hallazgos no se mandan aqui porque la pagina todavia no esta escuchando, ella avisa cuando termina de cargar
            if (message.command === 'ready') {
                this.renderFindings();
            }
            if (message.command === 'openFinding') {
                void this.openFinding(message.index);
            }
        });

        //si el usuario cierra el panel se suelta la referencia (solo si no es ya la de una vista nueva)
        webviewView.onDidDispose(() => {
            if (this.view === webviewView) { this.view = undefined; }
        });
    }

    constructor(private readonly state: vscode.Memento) {
        this.restore();
    }

    private lastCommit?: string;

    private restore(): void {
        const saved = this.state.get<PersistedFindings>(FINDINGS_STATE_KEY);
        if (!saved) { return; }

        const uri = vscode.Uri.parse(saved.folderUri);
        const folder = vscode.workspace.getWorkspaceFolder(uri) ?? vscode.workspace.workspaceFolders?.[0];
        if (!folder) { return; }

        this.folder = folder;
        this.lastCommit = saved.commit;
        this.findings = saved.findings;
    }

    public getRestoredResult(): { folder: vscode.WorkspaceFolder; findings: Finding[] } | undefined {
        if (!this.folder || this.findings.length === 0) { return undefined; }
        return { folder: this.folder, findings: this.findings };
    }

    public getCachedFindings(folder: vscode.WorkspaceFolder, commit: string): Finding[] | undefined {
        if (this.folder?.uri.toString() === folder.uri.toString() && this.lastCommit === commit) {
            return this.findings;
        }
        return undefined;
    }

    //metodo publcio, cada vez que termina un analisi actualiza folder, findings
    public update(folder: vscode.WorkspaceFolder, findings: Finding[], commit: string): void {
        this.folder = folder;
        this.lastCommit = commit;
        this.findings = sortFindings(findings); //el indice de cada hallazgo es el de la lista ordenada, el panel lo usa para abrirlo
        this.renderFindings();

        void this.state.update(FINDINGS_STATE_KEY, {
            folderUri: folder.uri.toString(),
            commit,
            findings: this.findings,
        } satisfies PersistedFindings); 
    }

    public getCurrentState(): { folder: vscode.WorkspaceFolder; findings: Finding[]; commit?: string } | undefined {
        if (!this.folder) { return undefined; }
        return { folder: this.folder, findings: this.findings, commit: this.lastCommit };
    }

    //envia findings actuales
    private renderFindings(): void {
        this.view?.webview.postMessage({ command: 'setFindings', findings: this.findings });
    }

    //cuando hace click en un hallazgo en el panel
    private async openFinding(index: number): Promise<void> {
        const finding = this.findings[index];
        if (!finding || !this.folder || finding.line === undefined) { return; }

        const uri = vscode.Uri.joinPath(this.folder.uri, finding.file); //resuelva la url del archivo
        const document = await vscode.workspace.openTextDocument(uri); //abre el documento
        const editor = await vscode.window.showTextDocument(document); //pisicona el cursor en la linea del finding
        const position = new vscode.Position(finding.line - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    }

    //genera el hrml que corre dentro del webview
    private getHtml(webview: vscode.Webview): string {
        const nonce = getNonce();
        return `<!DOCTYPE html>
                <html lang="es">
                <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <style>
                    body { font-family: var(--vscode-font-family); font-size: 13px; padding: 0; margin: 0; color: var(--vscode-foreground); }
                    .severity-title { padding: 6px 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--vscode-widget-border); }
                    .severity-title.Alta { color: #ff8080; }
                    .severity-title.Media { color: #e0b03a; }
                    .severity-title.Baja { color: #6fa8dc; }
                    details.rule > summary { padding: 6px 10px; cursor: pointer; border-bottom: 1px solid var(--vscode-widget-border); }
                    details.rule > summary:hover { background: var(--vscode-list-hoverBackground); }
                    .count { opacity: 0.7; font-size: 11px; margin-left: 4px; }
                    .finding { padding: 8px 10px; border-bottom: 1px solid var(--vscode-widget-border); cursor: pointer; }
                    .finding:hover { background: var(--vscode-list-hoverBackground); }
                    .finding.Alta { border-left: 3px solid #ff5a5a; }
                    .finding.Media { border-left: 3px solid #ffc83c; }
                    .finding.Baja { border-left: 3px solid #64b4ff; }
                    .location { opacity: 0.7; font-size: 11px; }
                    .message { margin: 4px 0; }
                    .suggestion { color: var(--vscode-textLink-foreground); font-size: 12px; }
                    .empty { padding: 16px; opacity: 0.7; text-align: center; }
                </style>
                </head>
                <body>
                    <div id="list"></div>
                    <script nonce="${nonce}">
                        const vscode = acquireVsCodeApi();
                        const list = document.getElementById('list');
                        const SEVERITIES = ['Alta', 'Media', 'Baja'];
                        const state = vscode.getState() || { open: {} }; //recuerda que grupos dejo abiertos o cerrados el usuario

                        window.addEventListener('message', event => {
                            if (event.data.command !== 'setFindings') { return; }
                            render(event.data.findings);
                        });

                        //agrupa los hallazgos por prioridad y dentro de cada una por regla (la extension los manda ya ordenados asi)
                        function render(findings) {
                            if (findings.length === 0) {
                                list.innerHTML = '<div class="empty">No se encontraron hallazgos.</div>';
                                return;
                            }

                            const groups = { Alta: new Map(), Media: new Map(), Baja: new Map() };
                            findings.forEach((f, i) => {
                                const rules = groups[f.severity];
                                if (!rules.has(f.rule)) { rules.set(f.rule, []); }
                                rules.get(f.rule).push({ finding: f, index: i }); //se guarda el indice para abrir el hallazgo al hacer click
                            });

                            list.innerHTML = SEVERITIES.filter(severity => groups[severity].size > 0).map(severity => {
                                const total = Array.from(groups[severity].values()).reduce((sum, items) => sum + items.length, 0);
                                const rules = Array.from(groups[severity].entries()).map(entry => renderRule(severity, entry[0], entry[1])).join('');
                                return '<div class="severity-title ' + severity + '">' + severity + ' (' + total + ')</div>' + rules;
                            }).join('');

                            document.querySelectorAll('.finding').forEach(el => {
                                el.addEventListener('click', () => {
                                    vscode.postMessage({ command: 'openFinding', index: Number(el.dataset.index) });
                                });
                            });

                            document.querySelectorAll('details.rule').forEach(el => {
                                el.addEventListener('toggle', () => {
                                    state.open[el.dataset.key] = el.open;
                                    vscode.setState(state);
                                });
                            });
                        }

                        //un grupo desplegable por regla, los de prioridad baja empiezan cerrados
                        function renderRule(severity, rule, items) {
                            const key = severity + '|' + rule;
                            const isOpen = key in state.open ? state.open[key] : severity !== 'Baja';
                            return '<details class="rule ' + severity + '" data-key="' + escapeHtml(key) + '"' + (isOpen ? ' open' : '') + '>' +
                                '<summary>' + escapeHtml(rule) + '<span class="count">' + items.length + '</span></summary>' +
                                items.map(item => renderFinding(item.finding, item.index)).join('') +
                                '</details>';
                        }

                        function renderFinding(f, index) {
                            return '<div class="finding ' + f.severity + '" data-index="' + index + '">' +
                                '<div class="location">' + escapeHtml(f.file) + (f.line ? ':' + f.line : '') + '</div>' +
                                '<div class="message">' + escapeHtml(f.message) + '</div>' +
                                (f.suggestion ? '<div class="suggestion"> ' + escapeHtml(f.suggestion) + '</div>' : '') +
                                '</div>';
                        }

                        function escapeHtml(text) {
                            const div = document.createElement('div');
                            div.textContent = text;
                            return div.innerHTML;
                        }

                        //avisa a la extension que la pagina ya esta escuchando para que le mande los hallazgos
                        vscode.postMessage({ command: 'ready' });
                    </script>
                </body>
                </html>`;
    }
}
