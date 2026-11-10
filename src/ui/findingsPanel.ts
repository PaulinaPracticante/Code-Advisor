// --------------------------------------------------------------------------------------------------
// ---- PANEL LATERAL -------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------

import * as vscode from 'vscode';
import { Finding } from '../engine/shared/finding';

//Genera strig aleatorio de 32 caracteres 
function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) { text += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return text;
}

//implementa la interfaz que vscode requiere para proveer contenido a una vista resgistrada
export class FindingsPanel implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeadvisor.findingsView';

    private view?: vscode.WebviewView; //referencia al webview
    private findings: Finding[] = []; //la ultima lista de hallazgos
    private folder?: vscode.WorkspaceFolder; //folder actual 
 
    //llama a este metodo cuando el usuario abre el panel por primera vez 
    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView; //guarda al referencia de webview
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtml(webviewView.webview); //inyecta el html
        this.renderFindings(); //manda datos actuales

        webviewView.webview.onDidReceiveMessage(message => {
            if (message.command === 'openFinding') {
                void this.openFinding(message.index);
            }
        });
    }

    //metodo publcio, cada vez que termina un analisi actualiza folder, findings 
    public update(folder: vscode.WorkspaceFolder, findings: Finding[]): void {
        this.folder = folder;
        this.findings = findings;
        this.renderFindings();
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

                        window.addEventListener('message', event => {
                            if (event.data.command !== 'setFindings') { return; }
                            render(event.data.findings);
                        });

                        function render(findings) {
                            if (findings.length === 0) {
                                list.innerHTML = '<div class="empty">No se encontraron hallazgos.</div>';
                                return;
                            }
                            list.innerHTML = findings.map((f, i) => \`
                                <div class="finding \${f.severity}" data-index="\${i}">
                                    <div class="location">\${escapeHtml(f.file)}\${f.line ? ':' + f.line : ''}</div>
                                    <div class="message">\${escapeHtml(f.message)}</div>
                                    \${f.suggestion ? '<div class="suggestion"> ' + escapeHtml(f.suggestion) + '</div>' : ''}
                                </div>
                            \`).join('');

                            document.querySelectorAll('.finding').forEach(el => {
                                el.addEventListener('click', () => {
                                    vscode.postMessage({ command: 'openFinding', index: Number(el.dataset.index) });
                                });
                            });
                        }

                        function escapeHtml(text) {
                            const div = document.createElement('div');
                            div.textContent = text;
                            return div.innerHTML;
                        }
                    </script>
                </body>
                </html>`;
    }
}