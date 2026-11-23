// ----------------------------------------------------------------------------------------------------
// ---- PANEL "CONFIGURAR ESTANDARES", SOLO PARA EL GERENTE -------------------------------------------
// ----------------------------------------------------------------------------------------------------

import * as vscode from 'vscode';
import { RULE_PRIORITIES, loadConfig } from '../engine/config/configLoader';
import { prepareConfigContent } from '../engine/config/configEditor';
import { changeManagerPassword, isManagerProtected, verifyManagerPassword } from '../engine/config/managerClient';
import { EXCLUDE_INFO, FIELD_EDITORS, PARAM_HELP, PARAM_LABELS, PARAM_OPTIONS, RULE_ALIASES, RULE_CATALOG, SCOPE_LABELS } from '../engine/config/ruleCatalog';
import { pushStandards } from '../engine/config/standardsClient';
import { getHistory } from '../engine/history/historyClient';


let currentPanel: vscode.WebviewPanel | undefined; //el panel abierto, solo puede haber uno

//Genera strig aleatorio de 32 caracteres
function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) { text += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return text;
}

//revisa que la contraseña capturada sea la que esta guardada en el backend; si el panel aun no esta protegido, pasa derecho
async function checkManagerAccess(): Promise<{ ok: true } | { error: string }> {
    if (!(await isManagerProtected())) { return { ok: true }; }

    const password = await vscode.window.showInputBox({
        prompt: 'Contraseña de gerente para configurar los estandares',
        password: true,
        ignoreFocusOut: true,
    });
    if (password === undefined) { return { error: '' }; }

    if (!(await verifyManagerPassword(password))) {
        return { error: 'Contraseña incorrecta.' };
    }
    return { ok: true };
}

//lo llama el webview cuando el gerente llena el formulario "Cambiar contraseña"; si ya habia una pide la actual
async function handleChangePassword(panel: vscode.WebviewPanel, message: { currentPassword?: string; newPassword: string }): Promise<void> {
    try {
        await changeManagerPassword(message.currentPassword, message.newPassword);
        void panel.webview.postMessage({ command: 'passwordChanged' });
        void vscode.window.showInformationMessage('Contraseña del gerente actualizada.');
    } catch (error) {
        const text = 'No se pudo cambiar la contraseña: ' + (error instanceof Error ? error.message : String(error));
        void panel.webview.postMessage({ command: 'passwordError', message: text });
    }
}

//firma y guarda en el proyecto lo que el gerente capturo en el panel
async function saveStandards(panel: vscode.WebviewPanel, message: { exclude: unknown; priorities: unknown; rules: unknown }): Promise<void> {
    const access = await checkManagerAccess(); //se vuelve a revisar, la llave pudo cambiar con el panel abierto
    if ('error' in access) {
        if (access.error !== '') {void panel.webview.postMessage({ command: 'error', message: access.error }); }
        return;
    }

    const prepared = prepareConfigContent({ exclude: message.exclude, priorities: message.priorities, rules: message.rules });
    if ('error' in prepared) {
        void panel.webview.postMessage({ command: 'error', message: prepared.error });
        return;
    }

    try {
        await pushStandards(prepared.content);
        void panel.webview.postMessage({ command: 'saved' });
        void vscode.window.showInformationMessage('Estándares guardados: ya aplican para todo el equipo.');
    } catch (error) {
        const text = 'No se pudo guardar: ' + (error instanceof Error ? error.message : String(error));
        void panel.webview.postMessage({ command: 'error', message: text });
    }
}

function asNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asText(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

//responde a la pestaña Historial: la pagina no llama a la API, lo hace la extension para que el token no salga de aqui
//solo acepta las consultas de esta lista
async function answerHistoryRequest(panel: vscode.WebviewPanel, message: { id: number; query: string; params?: Record<string, unknown> }): Promise<void> {
    const params = message.params ?? {};
    try {
        const client = getHistory();
        if (!client || !client.isEnabled()) { throw new Error('El historial todavía no está configurado'); }

        let data: unknown;
        if (message.query === 'repos') {
            data = await client.getRepos();
        } else if (message.query === 'summary') {
            data = await client.getSummary({ repoId: asNumber(params.repoId), days: asNumber(params.days) });
        } else if (message.query === 'cycles') {
            data = await client.getCycles({
                repoId: asNumber(params.repoId),
                state: asText(params.state),
                search: asText(params.search),
                limit: asNumber(params.limit),
                offset: asNumber(params.offset),
            });
        } else if (message.query === 'commits') {
            data = await client.getCycleCommits({
                repoId: Number(params.repoId),
                branch: String(params.branch ?? ''),
                pullRequestId: asNumber(params.pullRequestId) ?? null,
            });
        } else if (message.query === 'findings') {
            data = await client.getAnalysisFindings(Number(params.analysisId));
        } else {
            throw new Error('Consulta desconocida');
        }

        void panel.webview.postMessage({ command: 'historyResponse', id: message.id, ok: true, data });
    } catch (error) {
        void panel.webview.postMessage({ command: 'historyResponse', id: message.id, ok: false, error: (error as Error).message });
    }
}

//cada nombre antiguo de una regla con la informacion de la regla actual
function aliasEntries(): Record<string, (typeof RULE_CATALOG)[keyof typeof RULE_CATALOG]> {
    const entries: Record<string, (typeof RULE_CATALOG)[keyof typeof RULE_CATALOG]> = {};
    for (const [alias, rule] of Object.entries(RULE_ALIASES)) { entries[alias] = RULE_CATALOG[rule]; }
    return entries;
}

//abre el panel con la configuracion vigente del proyecto, solo si este equipo tiene la llave del gerente
async function openStandardsPanel(): Promise<void> {
    const access = await checkManagerAccess();
    if ('error' in access) {
        if (access.error !== '') { void vscode.window.showErrorMessage(access.error); }
        return;
    }

    if (currentPanel) {
        currentPanel.reveal();
        return;
    }

    //la configuracion vigente, si el archivo no tiene una firma valida se parte de la de por defecto
    const config = await loadConfig();

    const panel = vscode.window.createWebviewPanel('codeadvisor.standards', 'Configurar estándares', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true, //el formulario conserva lo capturado aunque el gerente cambie de pestaña
    });
    currentPanel = panel;
    panel.onDidDispose(() => { currentPanel = undefined; });
    panel.webview.html = getHtml(panel.webview);

    panel.webview.onDidReceiveMessage(async message => {
        //la pagina avisa cuando termina de cargar para que se le mande la configuracion
        if (message.command === 'ready') {
            void panel.webview.postMessage({
                command: 'load',
                protectedMode: await isManagerProtected(),
                historyEnabled: getHistory()?.isEnabled() ?? false,
                exclude: config.exclude,
                rules: config.rules,
                priorities: { ...RULE_PRIORITIES, ...config.priorities },
                //nombre y descripcion en español de cada regla; los alias son nombres antiguos que pueden seguir en el historial
                catalog: { ...aliasEntries(), ...RULE_CATALOG, __exclude: EXCLUDE_INFO },
                paramLabels: PARAM_LABELS,
                paramHelp: PARAM_HELP,
                paramOptions: PARAM_OPTIONS, //parametros de texto con valores fijos, se editan con una lista desplegable
                fieldEditors: FIELD_EDITORS, //parametros que se editan con algo mas que un cuadro de texto
                scopeLabels: SCOPE_LABELS, //Backend, Frontend y Compartidas
            });
        }
        if (message.command === 'save') {
            await saveStandards(panel, message);
        }
        if (message.command === 'historyRequest') {
            await answerHistoryRequest(panel, message);
        }
        if (message.command === 'changePassword') {
            await handleChangePassword(panel, message);
        }
    });
}

//registra los comandos del gerente
export function registerStandardsCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('codeadvisor.configureStandards', () => openStandardsPanel())
    );
}

//genera el html del panel, las reglas se agrupan por prioridad y cada una es una tarjeta con su interruptor, su prioridad y sus ajustes
function getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    return `<!DOCTYPE html>
            <html lang="es">
            <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <style>
                body { font-family: var(--vscode-font-family); font-size: 13px; color: var(--vscode-foreground); padding: 16px 16px 0; max-width: 980px; margin: 0 auto; }
                h2 { font-weight: 500; margin: 0 0 8px; }
                .hint { opacity: 0.8; margin: 0 0 12px; }
                .banner { padding: 8px 10px; margin: 0 0 12px; background: var(--vscode-inputValidation-warningBackground); border: 1px solid var(--vscode-inputValidation-warningBorder); }
                input[type=text], input[type=number], input[type=search], input[type=password], textarea, select { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, var(--vscode-widget-border)); padding: 4px 6px; font-family: inherit; font-size: inherit; }
                .password-box { margin: 0 0 12px; padding: 8px 12px; background: var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.12)); }
                .password-row { display: flex; gap: 8px; align-items: center; margin: 6px 0; flex-wrap: wrap; }
                .password-row label { width: 170px; flex: none; opacity: 0.85; }
                .password-row input { flex: 1; min-width: 160px; }
                input[type=search] { width: 100%; box-sizing: border-box; padding: 6px 8px; margin: 0 0 12px; }
                textarea { width: 100%; box-sizing: border-box; font-family: var(--vscode-editor-font-family); }
                .group-header { display: flex; align-items: center; gap: 8px; padding: 10px 4px; cursor: pointer; user-select: none; border-bottom: 1px solid var(--vscode-widget-border); margin-top: 8px; }
                .group-title { font-weight: 600; }
                .group-count { opacity: 0.7; }
                .chevron { margin-left: auto; opacity: 0.7; }
                .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
                .dot.Alta { background: #ff5a5a; }
                .dot.Media { background: #ffc83c; }
                .dot.Baja { background: #64b4ff; }
                .dot.General { background: var(--vscode-descriptionForeground); }
                .card { padding: 10px 4px 10px 10px; border-bottom: 1px solid var(--vscode-widget-border); border-left: 3px solid transparent; }
                .card.Alta { border-left-color: #ff5a5a; }
                .card.Media { border-left-color: #ffc83c; }
                .card.Baja { border-left-color: #64b4ff; }
                .card.off .card-text { opacity: 0.55; }
                .card-main { display: flex; gap: 12px; align-items: flex-start; }
                .card-text { flex: 1; min-width: 0; }
                .card-name { font-weight: 500; }
                .card-desc { opacity: 0.8; margin-top: 2px; }
                .card-id { opacity: 0.5; font-family: var(--vscode-editor-font-family); font-size: 11px; margin-top: 2px; }
                .card-actions { display: flex; gap: 8px; align-items: center; flex: none; }
                .switch, .switch-space { position: relative; width: 34px; height: 18px; flex: none; margin-top: 1px; display: inline-block; }
                .switch input { opacity: 0; width: 100%; height: 100%; margin: 0; position: absolute; cursor: pointer; z-index: 1; }
                .slider { position: absolute; inset: 0; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, var(--vscode-widget-border)); border-radius: 18px; }
                .slider::before { content: ''; position: absolute; width: 12px; height: 12px; left: 3px; top: 2px; border-radius: 50%; background: var(--vscode-foreground); opacity: 0.6; transition: transform 0.15s; }
                .switch input:checked + .slider { background: var(--vscode-button-background); }
                .switch input:checked + .slider::before { transform: translateX(15px); background: var(--vscode-button-foreground); opacity: 1; }
                .switch input:focus-visible + .slider { outline: 1px solid var(--vscode-focusBorder); }
                .link-button { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; padding: 2px 4px; font-size: inherit; }
                .settings { margin: 10px 0 4px 46px; padding: 8px 12px; background: var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.12)); }
                .field { display: grid; grid-template-columns: 230px 1fr; gap: 8px; align-items: start; margin: 6px 0; }
                .field-label { opacity: 0.85; padding-top: 4px; }
                .subgroup { margin: 8px 0 4px; padding-left: 10px; border-left: 2px solid var(--vscode-widget-border); }
                .subgroup-title { font-weight: 500; margin-bottom: 2px; }
                .empty { padding: 16px; opacity: 0.7; text-align: center; }
                .footer { position: sticky; bottom: 0; display: flex; gap: 10px; align-items: center; margin-top: 16px; padding: 10px 0; background: var(--vscode-editor-background); border-top: 1px solid var(--vscode-widget-border); }
                button.primary, button.secondary { border: none; padding: 6px 14px; cursor: pointer; font-size: inherit; }
                button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                button.primary:hover { background: var(--vscode-button-hoverBackground); }
                button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
                .status.error { color: var(--vscode-errorForeground); }
                [hidden] { display: none !important; }
                .tabs { display: flex; gap: 4px; margin: 0 0 14px; border-bottom: 1px solid var(--vscode-widget-border); }
                .tab-button { background: none; border: none; border-bottom: 2px solid transparent; padding: 8px 14px; color: var(--vscode-descriptionForeground); cursor: pointer; font-size: inherit; }
                .tab-button.active { color: var(--vscode-foreground); border-bottom-color: var(--vscode-focusBorder); font-weight: 600; }
                .toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin: 0 0 12px; }
                .toolbar input[type=search] { flex: 1; min-width: 180px; width: auto; margin: 0; }
                .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 0 0 12px; }
                .metric { background: var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.12)); padding: 10px 12px; }
                .metric-label, .muted { opacity: 0.75; font-size: 12px; }
                .metric-value { font-size: 22px; font-weight: 600; margin: 2px 0; }
                .metric-value.good, .funnel-number.good { color: #73c991; }
                .metric-value.bad, .funnel-number.bad { color: #ff8080; }
                .metric-extra { display: flex; gap: 4px; flex-wrap: wrap; font-size: 12px; opacity: 0.85; }
                .box { border: 1px solid var(--vscode-widget-border); padding: 10px 12px; margin: 0 0 12px; }
                .box-title { font-weight: 600; margin: 0 0 8px; }
                .trend { display: flex; align-items: flex-end; gap: 10px; height: 120px; }
                .week { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 4px; }
                .pair { display: flex; align-items: flex-end; gap: 3px; height: 92px; }
                .bar-detected, .bar-resolved { width: 12px; }
                .bar-detected { background: #64b4ff; }
                .bar-resolved { background: #73c991; }
                .legend { margin: 8px 0 0; font-size: 12px; opacity: 0.85; }
                .swatch { display: inline-block; width: 10px; height: 10px; margin: 0 4px 0 8px; vertical-align: -1px; }
                .rule-row { display: grid; grid-template-columns: minmax(0, 1.6fr) 54px minmax(0, 1fr) 30px auto; gap: 10px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--vscode-widget-border); }
                .rule-row:last-child { border-bottom: none; }
                .track { height: 6px; background: var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.2)); }
                .track span { display: block; height: 100%; background: #64b4ff; }
                .chip { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 12px; white-space: nowrap; }
                .chip.Alta { background: rgba(255, 90, 90, 0.18); color: #ff8080; }
                .chip.Media { background: rgba(255, 200, 60, 0.18); color: #e0b03a; }
                .chip.Baja, .chip.state-open { background: rgba(100, 180, 255, 0.18); color: #6fa8dc; }
                .chip.state-merged, .chip.status-new, .chip.status-resolved { background: rgba(115, 201, 145, 0.2); color: #73c991; }
                .chip.status-persisting { background: rgba(128, 128, 128, 0.2); }
                .mono { font-family: var(--vscode-editor-font-family); font-size: 12px; }
                .cycle { border: 1px solid var(--vscode-widget-border); margin: 0 0 10px; }
                .cycle-head { display: flex; gap: 10px; align-items: center; padding: 10px 12px; cursor: pointer; user-select: none; }
                .cycle-chevron { opacity: 0.7; }
                .cycle-meta { margin-left: auto; font-size: 12px; opacity: 0.75; }
                .funnel { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 0 12px 12px; }
                .funnel-number { font-size: 18px; font-weight: 600; line-height: 1.2; }
                .funnel-bar { flex: 1; min-width: 150px; }
                .sev { display: flex; height: 8px; overflow: hidden; background: var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.2)); }
                .cycle-body { border-top: 1px solid var(--vscode-widget-border); padding: 10px 12px; }
                .commit-row { display: grid; grid-template-columns: 64px minmax(0, 1fr) 132px 70px; gap: 10px; align-items: center; padding: 6px 8px; border-bottom: 1px solid var(--vscode-widget-border); cursor: pointer; }
                .commit-row.header { cursor: default; opacity: 0.75; font-size: 12px; }
                .commit-row.selected { background: var(--vscode-list-activeSelectionBackground, rgba(128, 128, 128, 0.2)); }
                .finding-row { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.7fr) 64px 76px; gap: 10px; align-items: center; padding: 5px 8px; border-bottom: 1px solid var(--vscode-widget-border); }
                .finding-row.resolved { opacity: 0.6; }
                .finding-row.resolved .finding-rule { text-decoration: line-through; }
                .more { text-align: center; margin: 12px 0; }
                .scope-bar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: 0 0 4px; }
                .scope-title { opacity: 0.75; margin-right: 4px; }
                .scope-button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid transparent; padding: 4px 12px; cursor: pointer; font-size: inherit; border-radius: 12px; }
                .scope-button:hover { background: var(--vscode-button-secondaryHoverBackground); }
                .scope-button.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                .scope-hint { opacity: 0.7; font-size: 12px; margin: 0 0 12px; }
                .scope-chip { display: inline-block; margin-left: 8px; padding: 0 7px; border-radius: 9px; font-size: 11px; font-weight: 400; vertical-align: 1px; }
                .scope-chip.backend { background: rgba(180, 142, 220, 0.2); color: #c4a1e8; }
                .scope-chip.frontend { background: rgba(78, 201, 176, 0.18); color: #4ec9b0; }
                .scope-chip.shared { background: rgba(128, 128, 128, 0.2); }
                .field.wide { grid-template-columns: minmax(0, 1fr); gap: 4px; }
                .field.wide > .field-label { padding-top: 0; font-weight: 500; }
                .help { opacity: 0.75; font-size: 12px; margin: 0 0 2px; }
                .mini-row { display: flex; gap: 12px; align-items: center; margin: 6px 0; flex-wrap: wrap; }
                .mini-label { width: 200px; flex: none; opacity: 0.85; }
                .mini-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
                input.narrow { width: 64px; }
                .check { display: inline-flex; align-items: center; gap: 4px; }
                .example, .tester-result { margin: 8px 0 4px; }
                .tester { margin: 6px 0 2px; }
                .tester input { width: 100%; box-sizing: border-box; }
                .ok { color: #73c991; }
                .bad { color: var(--vscode-errorForeground, #ff8080); }
                code { font-family: var(--vscode-editor-font-family); }
                details.advanced { margin: 8px 0 0; }
                details.advanced > summary { cursor: pointer; opacity: 0.8; }
                .pattern-row { margin: 4px 0; }
                .pattern-line { display: flex; gap: 6px; align-items: center; }
                .pattern-line input { flex: 1; min-width: 0; font-family: var(--vscode-editor-font-family); }
                input.invalid { outline: 1px solid var(--vscode-errorForeground, #ff8080); }
                .kind-chip { flex: none; padding: 0 7px; border-radius: 9px; font-size: 11px; background: rgba(128, 128, 128, 0.2); }
                .kind-chip.regex { background: rgba(255, 200, 60, 0.18); color: #e0b03a; }
                .mini-button { background: none; border: 1px solid var(--vscode-widget-border); color: var(--vscode-foreground); padding: 2px 8px; cursor: pointer; font-size: inherit; flex: none; }
                .mini-button:hover { background: var(--vscode-list-hoverBackground); }
                .sub-card { border: 1px solid var(--vscode-widget-border); padding: 8px 10px; margin: 8px 0; background: var(--vscode-editor-background); }
                .sub-card-head { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
                .sub-card-head input { flex: 1; min-width: 0; }
                .sub-card textarea { min-height: 120px; }
                .folders-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
                @media (max-width: 760px) { .folders-layout { grid-template-columns: minmax(0, 1fr); } }
                .tree { margin: 0; padding: 6px 8px; font-family: var(--vscode-editor-font-family); font-size: 12px; background: var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.12)); min-height: 60px; max-height: 220px; overflow: auto; }
                .tree-row.implied { opacity: 0.5; }
                .chip.repo-chip { background: rgba(128, 128, 128, 0.2); }
            </style>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const root = document.getElementById('root');
                    const GROUPS = ['Alta', 'Media', 'Baja'];
                    let data = null; //lo que mando la extension: reglas, prioridades, catalogo de nombres
                    let lastSent = null; //lo ultimo que se mando a guardar
                    let groupsBox = null;
                    let statusBox = null;
                    let standardsBox = null; //contenedor de la pestaña Estandares
                    let historyBox = null; //contenedor de la pestaña Historial
                    let activeTab = 'standards';
                    //lo que el gerente va capturando; texts guarda el texto de los campos de lista y JSON hasta que se guarda
                    //scope es el tipo de proyecto elegido en el filtro (all, backend, frontend o shared); testers guarda lo que se escribio en las cajas de prueba
                    const state = { rules: {}, priorities: {}, texts: {}, expanded: {}, closedGroups: {}, query: '', scope: 'all', exclude: '', testers: {}, passwordOpen: false };
                    let scopeBox = null; //contenedor de los botones de tipo de proyecto
                    let passwordStatusBox = null; //mensaje de error/exito del formulario de contraseña

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'load') { data = message; resetState(); render(); }
                        if (message.command === 'saved') { onSaved(); }
                        if (message.command === 'error') { setStatus(message.message, true); }
                        if (message.command === 'historyResponse') { onHistoryResponse(message); }
                        if (message.command === 'passwordChanged') { onPasswordChanged(); }
                        if (message.command === 'passwordError') { onPasswordError(message.message); }
                    });

                    function clone(value) { return JSON.parse(JSON.stringify(value)); }

                    //tipo de campo segun el valor: casilla, numero, texto, lista (arreglo de textos), objeto (se recorre) o JSON
                    function kindOf(value) {
                        if (typeof value === 'boolean') { return 'boolean'; }
                        if (typeof value === 'number') { return 'number'; }
                        if (typeof value === 'string') { return 'string'; }
                        if (Array.isArray(value)) { return value.every(item => typeof item === 'string') ? 'lines' : 'json'; }
                        return value !== null && typeof value === 'object' ? 'object' : 'json';
                    }

                    //recorre los valores de una regla y avisa de cada campo (los objetos se abren)
                    function walk(value, path, visit) {
                        const kind = kindOf(value);
                        if (kind === 'object') { Object.keys(value).forEach(key => walk(value[key], path.concat(key), visit)); }
                        else { visit(path, value, kind); }
                    }

                    function setAt(object, path, value) {
                        let target = object;
                        path.slice(0, -1).forEach(key => { target = target[key]; });
                        target[path[path.length - 1]] = value;
                    }

                    function getAt(object, path) { return path.reduce((target, key) => (target === undefined || target === null ? undefined : target[key]), object); }

                    //un parametro con editor propio (formato de commit, patrones, capas, repositorios) guarda su valor ya armado en state.rules
                    function isEditorField(rule, path) { return !!data.fieldEditors[rule + '.' + path.join('.')]; }

                    function toText(value, kind) { return kind === 'lines' ? value.join('\\n') : JSON.stringify(value, null, 2); }
                    function toLines(text) { return text.split('\\n').map(line => line.trim()).filter(line => line !== ''); }
                    function normalize(text) { return String(text).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, ''); }

                    function infoOf(name) { return data.catalog[name] || { name: name, description: '', scope: 'shared' }; }

                    //nombre en español del parametro, si no esta en el catalogo se muestra su nombre tecnico
                    function labelFor(rule, path) {
                        const last = path[path.length - 1];
                        return data.paramLabels[rule + '.' + path.join('.')] || data.paramLabels['*.' + last] || last;
                    }

                    //valores permitidos de un parametro de texto, undefined si acepta cualquier texto
                    function optionsFor(rule, path) {
                        return data.paramOptions[rule + '.' + path.join('.')] || data.paramOptions['*.' + path[path.length - 1]];
                    }

                    //una regla sin interruptor (solo prioridad) cuenta como activa
                    function isActive(name) {
                        const values = state.rules[name];
                        return !values || values.enabled !== false;
                    }

                    function resetState() {
                        state.rules = clone(data.rules);
                        state.priorities = clone(data.priorities);
                        state.texts = {};
                        Object.keys(state.rules).forEach(name => {
                            walk(state.rules[name], [], (path, value, kind) => {
                                if ((kind === 'lines' || kind === 'json') && !isEditorField(name, path)) { state.texts[name + '.' + path.join('.')] = toText(value, kind); }
                            });
                        });
                        state.testers = {};
                        state.exclude = data.exclude.join('\\n');
                    }

                    function setStatus(text, isError) {
                        if (!statusBox) { return; }
                        statusBox.textContent = text;
                        statusBox.className = isError ? 'status error' : 'status';
                    }

                    //crea un elemento: props se asignan como propiedades (text es el contenido y dataset los data-*)
                    function el(tag, props, children) {
                        const node = document.createElement(tag);
                        Object.keys(props || {}).forEach(key => {
                            if (key === 'text') { node.textContent = props[key]; }
                            else if (key === 'dataset') { Object.keys(props[key]).forEach(name => { node.dataset[name] = props[key][name]; }); }
                            else { node[key] = props[key]; }
                        });
                        (children || []).forEach(child => node.appendChild(child));
                        return node;
                    }

                    //la regla coincide si todas las palabras buscadas estan en su nombre, descripcion o identificador
                    function matches(name) {
                        const words = normalize(state.query).split(' ').filter(word => word !== '');
                        if (words.length === 0) { return true; }
                        const info = infoOf(name);
                        const haystack = normalize(info.name + ' ' + info.description + ' ' + name);
                        return words.every(word => haystack.includes(word));
                    }

                    //reglas de un grupo: las de esa prioridad, o en General las que no tienen prioridad (y las rutas excluidas)
                    function namesIn(group) {
                        const names = group === 'General'
                            ? Object.keys(state.rules).filter(name => !(name in state.priorities)).concat(['__exclude'])
                            : Object.keys(state.priorities).filter(name => state.priorities[name] === group);
                        return names.filter(matches).filter(inScope).sort((a, b) => infoOf(a).name.localeCompare(infoOf(b).name, 'es'));
                    }

                    //la regla cuenta si coincide con el tipo de proyecto elegido en el filtro
                    function inScope(name) { return state.scope === 'all' || infoOf(name).scope === state.scope; }

                    //todos los nombres que se pueden mostrar: reglas con prioridad, ajustes sin prioridad y las rutas excluidas
                    function allNames() {
                        return Object.keys(state.priorities).concat(Object.keys(state.rules).filter(name => !(name in state.priorities)), ['__exclude']);
                    }

                    function scopeTitle(scope) { return scope === 'all' ? 'Todos' : data.scopeLabels[scope]; }

                    function scopeChip(scope) { return el('span', { className: 'scope-chip ' + scope, text: data.scopeLabels[scope] || scope }); }

                    //botones de tipo de proyecto con cuantas reglas coinciden con la busqueda en cada uno
                    function renderScopeBar() {
                        scopeBox.textContent = '';
                        scopeBox.appendChild(el('span', { className: 'scope-title', text: 'Tipo de proyecto:' }));
                        ['all', 'backend', 'frontend', 'shared'].forEach(scope => {
                            const count = allNames().filter(name => matches(name) && (scope === 'all' || infoOf(name).scope === scope)).length;
                            const button = el('button', { className: 'scope-button' + (state.scope === scope ? ' active' : ''), text: scopeTitle(scope) + ' · ' + count });
                            button.addEventListener('click', () => { state.scope = scope; renderScopeBar(); renderGroups(); });
                            scopeBox.appendChild(button);
                        });
                    }

                    //formulario para poner o cambiar la contraseña del gerente; si ya habia una pide la actual
                    function renderPasswordBox() {
                        const box = el('div', { className: 'password-box' });
                        const toggle = el('button', {
                            className: 'link-button',
                            text: state.passwordOpen ? 'Cancelar' : (data.protectedMode ? 'Cambiar contraseña del gerente' : 'Proteger con contraseña'),
                        });
                        toggle.addEventListener('click', () => { state.passwordOpen = !state.passwordOpen; renderStandards(); });
                        box.appendChild(toggle);

                        if (state.passwordOpen) {
                            const currentInput = data.protectedMode ? el('input', { type: 'password', placeholder: 'Contraseña actual' }) : null;
                            const newInput = el('input', { type: 'password', placeholder: 'Contraseña nueva (minimo 6 caracteres)' });
                            const confirmInput = el('input', { type: 'password', placeholder: 'Confirmar contraseña nueva' });
                            passwordStatusBox = el('span', { className: 'status' });

                            if (currentInput) { box.appendChild(el('div', { className: 'password-row' }, [el('label', { text: 'Contraseña actual' }), currentInput])); }
                            box.appendChild(el('div', { className: 'password-row' }, [el('label', { text: 'Contraseña nueva' }), newInput]));
                            box.appendChild(el('div', { className: 'password-row' }, [el('label', { text: 'Confirmar contraseña' }), confirmInput]));

                            const submit = el('button', { className: 'primary', text: 'Guardar contraseña' });
                            submit.addEventListener('click', () => {
                                if (newInput.value.length < 6) { onPasswordError('La contraseña nueva debe tener al menos 6 caracteres.'); return; }
                                if (newInput.value !== confirmInput.value) { onPasswordError('Las contraseñas nuevas no coinciden.'); return; }
                                vscode.postMessage({ command: 'changePassword', currentPassword: currentInput ? currentInput.value : undefined, newPassword: newInput.value });
                            });
                            box.appendChild(el('div', { className: 'password-row' }, [submit, passwordStatusBox]));
                        }
                        return box;
                    }

                    //dibuja la pestaña de estandares dentro de su contenedor (root se redefine aqui para no tocar el resto de la funcion)
                    function renderStandards() {
                        const root = standardsBox;
                        root.textContent = '';
                        root.appendChild(el('h2', { text: 'Estándares del equipo' }));
                        if (!data.protectedMode) {
                            root.appendChild(el('div', { className: 'banner', text: 'La configuración todavía no está protegida con contraseña: cualquiera con acceso al proyecto puede cambiarla.' }));
                        }
                        root.appendChild(renderPasswordBox());

                        const search = el('input', { type: 'search', placeholder: 'Buscar una regla por nombre o descripción...', value: state.query });
                        search.setAttribute('aria-label', 'Buscar regla');
                        search.addEventListener('input', () => { state.query = search.value; renderScopeBar(); renderGroups(); });
                        root.appendChild(search);

                        scopeBox = el('div', { className: 'scope-bar' });
                        root.appendChild(scopeBox);
                        root.appendChild(el('p', { className: 'scope-hint', text: 'Las reglas de Backend o Frontend solo se revisan en proyectos de ese tipo (o fullstack); las Compartidas se revisan en todos.' }));
                        renderScopeBar();

                        groupsBox = el('div');
                        root.appendChild(groupsBox);

                        statusBox = el('span', { className: 'status' });
                        const saveButton = el('button', { className: 'primary', text: 'Guardar' });
                        saveButton.addEventListener('click', save);
                        const discardButton = el('button', { className: 'secondary', text: 'Descartar cambios' });
                        discardButton.addEventListener('click', () => { resetState(); renderStandards(); setStatus('Cambios descartados.', false); });
                        root.appendChild(el('div', { className: 'footer' }, [saveButton, discardButton, statusBox]));

                        renderGroups();
                    }

                    //dibuja los grupos Alta, Media y Baja con sus tarjetas, focusKey devuelve el foco al control que se acaba de usar
                    function renderGroups(focusKey) {
                        groupsBox.textContent = '';
                        let shown = 0;
                        GROUPS.concat(['General']).forEach(group => {
                            const names = namesIn(group);
                            if (names.length === 0) { return; }
                            shown += names.length;
                            const open = state.query !== '' || !state.closedGroups[group];
                            const count = group === 'General'
                                ? names.length + ' ajustes'
                                : names.length + (names.length === 1 ? ' regla' : ' reglas') + ' · ' + names.filter(isActive).length + ' activas';
                            const header = el('div', { className: 'group-header' }, [
                                el('span', { className: 'dot ' + group }),
                                el('span', { className: 'group-title', text: group === 'General' ? 'Ajustes generales' : 'Prioridad ' + group }),
                                el('span', { className: 'group-count', text: count }),
                                el('span', { className: 'chevron', text: open ? '▾' : '▸' }),
                            ]);
                            header.addEventListener('click', () => { state.closedGroups[group] = open; renderGroups(); });
                            groupsBox.appendChild(header);
                            if (open) { names.forEach(name => groupsBox.appendChild(renderCard(name, group))); }
                        });
                        if (shown === 0) { groupsBox.appendChild(el('div', { className: 'empty', text: 'Ninguna regla coincide con la búsqueda.' })); }
                        if (focusKey) {
                            const target = document.querySelector('[data-focus="' + focusKey + '"]');
                            if (target) { target.focus(); }
                        }
                    }

                    //una tarjeta por regla: interruptor, nombre y descripcion, prioridad y sus ajustes
                    function renderCard(name, group) {
                        const info = infoOf(name);
                        const values = state.rules[name];
                        const hasEnabled = !!values && typeof values.enabled === 'boolean';
                        const hasSettings = !!values && Object.keys(values).some(key => key !== 'enabled');
                        const card = el('div', { className: 'card ' + group + (hasEnabled && !values.enabled ? ' off' : ''), dataset: { card: name } });

                        const main = el('div', { className: 'card-main' });
                        main.appendChild(hasEnabled ? renderSwitch(name) : el('span', { className: 'switch-space' }));
                        main.appendChild(el('div', { className: 'card-text' }, [
                            el('div', { className: 'card-name' }, [document.createTextNode(info.name), scopeChip(info.scope)]),
                            el('div', { className: 'card-desc', text: info.description }),
                            el('div', { className: 'card-id', text: name === '__exclude' ? 'exclude' : name }),
                        ]));

                        const actions = el('div', { className: 'card-actions' });
                        if (name in state.priorities) { actions.appendChild(renderPrioritySelect(name)); }
                        if (hasSettings) {
                            const open = !!state.expanded[name];
                            const button = el('button', { className: 'link-button', text: open ? 'Ajustes ▾' : 'Ajustes ▸' });
                            button.addEventListener('click', () => { state.expanded[name] = !open; renderGroups(); });
                            actions.appendChild(button);
                        }
                        main.appendChild(actions);
                        card.appendChild(main);

                        if (name === '__exclude') { card.appendChild(renderExcludeBox()); }
                        else if (hasSettings && state.expanded[name]) { card.appendChild(renderSettings(name)); }
                        return card;
                    }

                    function renderSwitch(name) {
                        const input = el('input', { type: 'checkbox', checked: state.rules[name].enabled, dataset: { focus: name + ':enabled' } });
                        input.setAttribute('aria-label', 'Activar ' + infoOf(name).name);
                        input.addEventListener('change', () => { state.rules[name].enabled = input.checked; renderGroups(name + ':enabled'); });
                        return el('label', { className: 'switch' }, [input, el('span', { className: 'slider' })]);
                    }

                    //al cambiar la prioridad la tarjeta pasa a otro grupo, que se abre para que no se pierda de vista
                    function renderPrioritySelect(name) {
                        const select = el('select', { dataset: { focus: name + ':priority' } });
                        select.setAttribute('aria-label', 'Prioridad de ' + infoOf(name).name);
                        GROUPS.forEach(priority => {
                            select.appendChild(el('option', { value: priority, text: priority, selected: state.priorities[name] === priority }));
                        });
                        select.addEventListener('change', () => {
                            state.priorities[name] = select.value;
                            state.closedGroups[select.value] = false;
                            renderGroups(name + ':priority');
                        });
                        return select;
                    }

                    function renderExcludeBox() {
                        const box = el('textarea', { rows: 5, value: state.exclude, placeholder: 'Uno por línea, por ejemplo **/node_modules/**' });
                        box.addEventListener('input', () => { state.exclude = box.value; });
                        return el('div', { className: 'settings' }, [box]);
                    }

                    function renderSettings(name) {
                        const box = el('div', { className: 'settings' });
                        renderObject(box, name, state.rules[name], []);
                        return box;
                    }

                    //un campo por parametro, los objetos se muestran como un subgrupo con su titulo
                    function renderObject(box, name, object, path) {
                        Object.keys(object).forEach(key => {
                            if (path.length === 0 && key === 'enabled') { return; }
                            const value = object[key];
                            const fullPath = path.concat(key);
                            const label = labelFor(name, fullPath);
                            const kind = kindOf(value);
                            if (isEditorField(name, fullPath)) {
                                box.appendChild(renderEditorField(name, fullPath, label));
                            } else if (kind === 'object') {
                                const sub = el('div', { className: 'subgroup' }, [el('div', { className: 'subgroup-title', text: label })]);
                                renderObject(sub, name, value, fullPath);
                                box.appendChild(sub);
                            } else {
                                box.appendChild(el('label', { className: 'field' }, [el('span', { className: 'field-label', text: label }), renderField(name, fullPath, value, kind)]));
                            }
                        });
                    }

                    function renderField(name, path, value, kind) {
                        const key = name + '.' + path.join('.');
                        let input;
                        if (kind === 'boolean') {
                            input = el('input', { type: 'checkbox', checked: value });
                            input.addEventListener('change', () => { setAt(state.rules[name], path, input.checked); });
                        } else if (kind === 'number') {
                            input = el('input', { type: 'number', min: '0', step: '1', value: String(value) }); //solo enteros desde 0
                            input.addEventListener('input', () => { setAt(state.rules[name], path, input.value.trim() === '' ? NaN : Number(input.value)); });
                        } else if (kind === 'string' && optionsFor(name, path)) {
                            const options = optionsFor(name, path);
                            //un valor guardado que ya no es valido se muestra marcado para que el gerente lo cambie, si no parecería tener la primera opción
                            const invalid = options.indexOf(value) < 0 ? [el('option', { value: value, text: value + ' (no válido)', selected: true })] : [];
                            input = el('select', {}, invalid.concat(options.map(option => el('option', { value: option, text: option, selected: option === value }))));
                            input.addEventListener('change', () => { setAt(state.rules[name], path, input.value); });
                        } else if (kind === 'string') {
                            input = el('input', { type: 'text', value: value });
                            input.addEventListener('input', () => { setAt(state.rules[name], path, input.value); });
                        } else {
                            input = el('textarea', { rows: kind === 'lines' ? Math.max(2, Math.min(8, value.length)) : 8, value: state.texts[key], placeholder: kind === 'lines' ? 'Uno por línea' : 'JSON' });
                            input.addEventListener('input', () => { state.texts[key] = input.value; });
                        }
                        return input;
                    }

                    // ------------------------------------------------------------------ editores de parametros con estructura propia

                    const BS = String.fromCharCode(92); //la diagonal invertida, asi no se confunde con los escapes de este texto

                    function row(label, controls) {
                        return el('div', { className: 'mini-row' }, [el('span', { className: 'mini-label', text: label }), el('div', { className: 'mini-controls' }, controls)]);
                    }

                    function smallButton(text, onClick) {
                        const button = el('button', { className: 'mini-button', text: text, type: 'button' });
                        button.addEventListener('click', onClick);
                        return button;
                    }

                    //un parametro con editor propio: su titulo, su ayuda y el editor, que se dibuja dentro de su contenedor
                    function renderEditorField(name, path, label) {
                        const key = name + '.' + path.join('.');
                        const field = el('div', { className: 'field wide' }, [el('div', { className: 'field-label', text: label })]);
                        if (data.paramHelp[key]) { field.appendChild(el('div', { className: 'help', text: data.paramHelp[key] })); }
                        const body = el('div');
                        field.appendChild(body);
                        const editor = data.fieldEditors[key];
                        if (editor === 'commitTitle') { drawCommitEditor(body, name, path); }
                        else if (editor === 'patterns') { drawPatternsEditor(body, name, path, key); }
                        else if (editor === 'layers') { drawLayersEditor(body, name, path); }
                        else if (editor === 'folderRepos') { drawReposEditor(body, name, path); }
                        return field;
                    }

                    //true si el texto compila como expresion regular, null si no; con un texto de prueba regresa si coincide
                    function testPattern(pattern, text) {
                        try { return new RegExp(pattern).test(text); } catch (error) { return null; }
                    }

                    // ---- formato del titulo del commit: se arma con opciones y la expresion regular queda como opcion avanzada

                    const COMMIT_TAIL = BS + 'S.*$';
                    const COMMIT_SPACE = { optional: BS + 's?', required: BS + 's', none: '' };
                    const COMMIT_SEPARATORS = [[':', 'Dos puntos ( : )'], ['_', 'Guion bajo ( _ )'], ['-', 'Guion ( - )']];

                    //lee las opciones guiadas dentro de la expresion regular, regresa null si el formato es personalizado
                    function parseCommitPattern(text) {
                        const head = '^[A-Z]{';
                        if (typeof text !== 'string' || text.indexOf(head) !== 0 || text.slice(-COMMIT_TAIL.length) !== COMMIT_TAIL) { return null; }
                        const middle = text.slice(head.length, text.length - COMMIT_TAIL.length);
                        const closeRange = middle.indexOf('}[');
                        if (closeRange < 0) { return null; }
                        const range = middle.slice(0, closeRange).split(',');
                        const afterRange = middle.slice(closeRange + 2);
                        const closeClass = afterRange.indexOf(']');
                        if (range.length !== 2 || closeClass < 1) { return null; }
                        const separators = afterRange.slice(0, closeClass);
                        const spacing = afterRange.slice(closeClass + 1);
                        const space = Object.keys(COMMIT_SPACE).find(option => COMMIT_SPACE[option] === spacing);
                        if (!/^\\d+$/.test(range[0]) || !/^\\d+$/.test(range[1]) || !/^[:_-]+$/.test(separators) || space === undefined) { return null; }
                        return { min: Number(range[0]), max: Number(range[1]), separators: separators.split(''), space: space };
                    }

                    function buildCommitPattern(parts) {
                        const separators = COMMIT_SEPARATORS.map(item => item[0]).filter(separator => parts.separators.indexOf(separator) >= 0).join('');
                        return '^[A-Z]{' + parts.min + ',' + parts.max + '}[' + separators + ']' + COMMIT_SPACE[parts.space] + COMMIT_TAIL;
                    }

                    function commitExample(parts) {
                        const letterCount = Math.max(parts.min, Math.min(4, parts.max));
                        return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, letterCount) + parts.separators[0] + (parts.space === 'required' ? ' ' : '') + 'Corrige la validación del login';
                    }

                    function drawCommitEditor(body, name, path) {
                        body.textContent = '';
                        const rule = state.rules[name];
                        const key = name + '.' + path.join('.');
                        const parts = parseCommitPattern(getAt(rule, path));
                        const example = el('div', { className: 'example' });
                        const testBox = el('input', { type: 'text', placeholder: 'Escribe un título para probarlo, por ejemplo ABCD:Corrige el login', value: state.testers[key] || '' });
                        const testResult = el('div', { className: 'tester-result' });
                        const rawInput = el('input', { type: 'text', value: String(getAt(rule, path)) });
                        rawInput.style.width = '100%';
                        rawInput.style.boxSizing = 'border-box';
                        rawInput.style.fontFamily = 'var(--vscode-editor-font-family)';
                        const rawStatus = el('div', { className: 'help' });

                        //actualiza lo que depende del patron: el ejemplo, el resultado de la prueba y la expresion
                        function refresh() {
                            const pattern = String(getAt(rule, path));
                            const current = parseCommitPattern(pattern);
                            example.textContent = '';
                            if (current) {
                                example.appendChild(el('span', { className: 'muted', text: 'Ejemplo de un título válido: ' }));
                                example.appendChild(el('code', { text: commitExample(current) }));
                            }
                            const result = testBox.value === '' ? undefined : testPattern(pattern, testBox.value);
                            testResult.className = 'tester-result ' + (result === undefined ? 'muted' : result === true ? 'ok' : 'bad');
                            testResult.textContent = result === undefined ? '' : result === null ? 'La expresión regular no es válida.' : result ? '✓ Este título cumple el formato.' : '✗ Este título no cumple el formato.';
                            const valid = testPattern(pattern, '') !== null;
                            rawStatus.textContent = valid ? '' : 'No es una expresión regular válida.';
                            rawStatus.className = valid ? 'help' : 'help bad';
                            rawInput.classList.toggle('invalid', !valid);
                            if (document.activeElement !== rawInput) { rawInput.value = pattern; }
                        }

                        if (parts) {
                            const min = el('input', { type: 'number', className: 'narrow', value: String(parts.min) });
                            const max = el('input', { type: 'number', className: 'narrow', value: String(parts.max) });
                            const checks = COMMIT_SEPARATORS.map(item => {
                                const box = el('input', { type: 'checkbox', checked: parts.separators.indexOf(item[0]) >= 0 });
                                box.dataset.separator = item[0];
                                return el('label', { className: 'check' }, [box, document.createTextNode(item[1])]);
                            });
                            const space = el('select', {}, [option('optional', 'Opcional', parts.space === 'optional'), option('required', 'Obligatorio (un espacio)', parts.space === 'required'), option('none', 'Sin espacio', parts.space === 'none')]);
                            const warning = el('div', { className: 'help bad' });

                            //arma el patron con lo que hay en las opciones; si algo no es valido se avisa y se conserva el patron anterior
                            const apply = () => {
                                const next = {
                                    min: Number(min.value),
                                    max: Number(max.value),
                                    separators: checks.map(label => label.firstChild).filter(box => box.checked).map(box => box.dataset.separator),
                                    space: space.value,
                                };
                                let problem = '';
                                if (!Number.isInteger(next.min) || !Number.isInteger(next.max) || next.min < 1) { problem = 'Las iniciales deben tener al menos 1 letra.'; }
                                else if (next.max < next.min) { problem = 'El máximo de letras no puede ser menor que el mínimo.'; }
                                else if (next.separators.length === 0) { problem = 'Elige al menos un separador.'; }
                                warning.textContent = problem;
                                if (problem !== '') { return; }
                                setAt(rule, path, buildCommitPattern(next));
                                refresh();
                            };
                            [min, max, space].forEach(control => { control.addEventListener('input', apply); control.addEventListener('change', apply); });
                            checks.forEach(label => label.firstChild.addEventListener('change', apply));

                            body.appendChild(row('Iniciales', [document.createTextNode('de '), min, document.createTextNode(' a '), max, document.createTextNode(' letras mayúsculas')]));
                            body.appendChild(row('Separador permitido', checks));
                            body.appendChild(row('Espacio después del separador', [space]));
                            body.appendChild(warning);
                        } else {
                            const reset = smallButton('Usar el formato guiado', () => {
                                setAt(rule, path, buildCommitPattern({ min: 2, max: 5, separators: [':', '_'], space: 'optional' }));
                                drawCommitEditor(body, name, path);
                            });
                            body.appendChild(el('div', { className: 'help' }, [document.createTextNode('Este formato es personalizado y no se puede mostrar con las opciones guiadas. '), reset]));
                        }

                        body.appendChild(example);
                        body.appendChild(el('div', { className: 'tester' }, [testBox]));
                        body.appendChild(testResult);
                        body.appendChild(el('details', { className: 'advanced', open: !parts }, [el('summary', { text: 'Avanzado: editar la expresión regular' }), rawInput, rawStatus]));

                        testBox.addEventListener('input', () => { state.testers[key] = testBox.value; refresh(); });
                        rawInput.addEventListener('input', () => { setAt(rule, path, rawInput.value); refresh(); });
                        rawInput.addEventListener('change', () => { drawCommitEditor(body, name, path); }); //al terminar de escribir se vuelve a leer el formato guiado
                        refresh();
                    }

                    // ---- lista de patrones: palabras o expresiones regulares, con una caja para probarlos

                    function isPlainWord(pattern) { return /^[A-Za-z0-9_]+$/.test(pattern); }

                    function drawPatternsEditor(body, name, path, key) {
                        body.textContent = '';
                        const list = getAt(state.rules[name], path);
                        const forDatabase = key === 'layers.databaseUsagePatterns'; //el analizador busca estas palabras completas
                        const rows = el('div');
                        const testBox = el('input', { type: 'text', placeholder: 'Pega una línea de código para ver si algún patrón la reconoce', value: state.testers[key] || '' });
                        const testResult = el('div', { className: 'tester-result' });

                        function compile(pattern) {
                            try { return new RegExp(forDatabase ? BS + 'b(?:' + pattern + ')' + BS + 'b' : pattern); } catch (error) { return null; }
                        }

                        function refreshTest() {
                            const text = testBox.value;
                            testResult.className = 'tester-result muted';
                            testResult.textContent = '';
                            if (text === '') { return; }
                            const hits = list.map(pattern => pattern.trim()).filter(pattern => pattern !== '' && compile(pattern) !== null && compile(pattern).test(text));
                            testResult.className = 'tester-result ' + (hits.length > 0 ? 'ok' : 'bad');
                            testResult.textContent = hits.length > 0
                                ? (forDatabase ? '✓ Se detecta como uso de base de datos por: ' : '✓ Se permite por: ') + hits.join('  ·  ')
                                : (forDatabase ? '✗ Ningún patrón la detecta.' : '✗ Ningún patrón la permite.');
                        }

                        list.forEach((pattern, index) => {
                            const input = el('input', { type: 'text', value: pattern, placeholder: 'Palabra o expresión regular' });
                            const kind = el('span', { className: 'kind-chip' });
                            const message = el('div', { className: 'help bad' });
                            const check = () => {
                                const trimmed = input.value.trim();
                                const plain = isPlainWord(trimmed);
                                kind.textContent = trimmed === '' ? '' : plain ? 'texto' : 'regex';
                                kind.className = 'kind-chip' + (plain || trimmed === '' ? '' : ' regex');
                                kind.title = plain ? 'Se busca esta palabra tal cual' : 'Es una expresión regular: usa caracteres especiales';
                                const invalid = trimmed !== '' && compile(trimmed) === null;
                                input.classList.toggle('invalid', invalid);
                                message.textContent = invalid ? 'No es una expresión regular válida.' : '';
                            };
                            input.addEventListener('input', () => { list[index] = input.value; check(); refreshTest(); });
                            check();
                            const remove = smallButton('Quitar', () => { list.splice(index, 1); drawPatternsEditor(body, name, path, key); });
                            rows.appendChild(el('div', { className: 'pattern-row' }, [el('div', { className: 'pattern-line' }, [input, kind, remove]), message]));
                        });

                        const add = smallButton('+ Agregar patrón', () => {
                            list.push('');
                            drawPatternsEditor(body, name, path, key);
                            const inputs = body.querySelectorAll('.pattern-line input');
                            inputs[inputs.length - 1].focus();
                        });
                        const exampleText = forDatabase
                            ? 'Puedes escribir una palabra tal cual (DbContext) o una expresión regular (mysqli_' + BS + 'w+ coincide con mysqli_query, mysqli_connect...).'
                            : 'Puedes escribir texto tal cual o una expresión regular.';

                        body.appendChild(rows);
                        body.appendChild(add);
                        body.appendChild(el('div', { className: 'help', text: exampleText }));
                        body.appendChild(el('div', { className: 'tester' }, [testBox]));
                        body.appendChild(testResult);
                        testBox.addEventListener('input', () => { state.testers[key] = testBox.value; refreshTest(); });
                        refreshTest();
                    }

                    // ---- capas del backend: una tarjeta por capa

                    function layerMode(layer) { return layer.required ? 'always' : layer.requiredIfDatabaseDetected ? 'database' : 'optional'; }

                    function setLayerMode(layer, mode) {
                        layer.required = mode === 'always';
                        if (mode === 'database') { layer.requiredIfDatabaseDetected = true; } else { delete layer.requiredIfDatabaseDetected; }
                    }

                    function drawLayersEditor(body, name, path) {
                        body.textContent = '';
                        const layers = getAt(state.rules[name], path);
                        const redraw = () => drawLayersEditor(body, name, path);

                        layers.forEach((layer, index) => {
                            const nameInput = el('input', { type: 'text', value: layer.name || '', placeholder: 'Nombre de la capa, por ejemplo Servicios' });
                            nameInput.addEventListener('input', () => { layer.name = nameInput.value; });
                            const folders = el('input', { type: 'text', value: (layer.folders || []).join(', '), placeholder: 'services, servicios' });
                            folders.style.minWidth = '300px';
                            folders.addEventListener('input', () => { layer.folders = folders.value.split(',').map(item => item.trim()).filter(item => item !== ''); });
                            const mode = el('select', {}, [
                                option('always', 'Siempre', layerMode(layer) === 'always'),
                                option('database', 'Solo si el proyecto usa base de datos', layerMode(layer) === 'database'),
                                option('optional', 'Opcional (no se exige)', layerMode(layer) === 'optional'),
                            ]);
                            mode.addEventListener('change', () => { setLayerMode(layer, mode.value); });
                            body.appendChild(el('div', { className: 'sub-card' }, [
                                el('div', { className: 'sub-card-head' }, [nameInput, smallButton('Quitar capa', () => { layers.splice(index, 1); redraw(); })]),
                                row('Carpetas aceptadas', [folders]),
                                row('Es obligatoria', [mode]),
                            ]));
                        });

                        body.appendChild(smallButton('+ Agregar capa', () => { layers.push({ name: '', folders: [], required: true }); redraw(); }));
                        body.appendChild(el('div', { className: 'help', text: 'Separa los nombres de carpeta con coma; se guardan en minúsculas y no importa cómo estén escritas en el proyecto.' }));
                    }

                    // ---- carpetas obligatorias de cada repositorio, con una vista de arbol

                    //dibuja las carpetas como arbol; las que no se escribieron pero son padre de otra se muestran atenuadas
                    function renderTree(box, paths) {
                        box.textContent = '';
                        const explicit = {};
                        const all = {};
                        paths.forEach(raw => {
                            const clean = raw.trim().replace(/^\\.\\//, '').replace(/^\\/+|\\/+$/g, '');
                            if (clean === '') { return; }
                            explicit[clean] = true;
                            const parts = clean.split('/');
                            for (let i = 1; i <= parts.length; i++) { all[parts.slice(0, i).join('/')] = true; }
                        });
                        const names = Object.keys(all).sort();
                        if (names.length === 0) { box.appendChild(el('div', { className: 'muted', text: 'Todavía no hay carpetas.' })); return; }
                        names.forEach(full => {
                            const parts = full.split('/');
                            const line = el('div', { className: 'tree-row' + (explicit[full] ? '' : ' implied'), text: '  '.repeat(parts.length - 1) + parts[parts.length - 1] + '/' });
                            line.style.whiteSpace = 'pre';
                            box.appendChild(line);
                        });
                    }

                    function drawReposEditor(body, name, path) {
                        body.textContent = '';
                        const repos = getAt(state.rules[name], path);
                        const redraw = () => drawReposEditor(body, name, path);

                        repos.forEach((repo, index) => {
                            const nameInput = el('input', { type: 'text', value: repo.name || '', placeholder: 'Nombre del repositorio, por ejemplo OnSiteV2_MX' });
                            nameInput.addEventListener('input', () => { repo.name = nameInput.value; });
                            const naming = el('select', {}, [
                                option('PascalCase', 'PascalCase (MiCarpeta)', repo.naming === 'PascalCase'),
                                option('kebab-case', 'kebab-case (mi-carpeta)', repo.naming === 'kebab-case'),
                                option('none', 'No revisar cómo se llaman', repo.naming === 'none'),
                            ]);
                            naming.addEventListener('change', () => { repo.naming = naming.value; });
                            const area = el('textarea', { rows: 7, value: (repo.requiredFolders || []).join('\\n'), placeholder: 'Una carpeta por línea, por ejemplo src/components' });
                            const tree = el('div', { className: 'tree' });
                            const count = el('div', { className: 'help' });
                            const update = () => {
                                repo.requiredFolders = toLines(area.value);
                                renderTree(tree, repo.requiredFolders);
                                count.textContent = repo.requiredFolders.length + (repo.requiredFolders.length === 1 ? ' carpeta obligatoria' : ' carpetas obligatorias');
                            };
                            area.addEventListener('input', update);
                            update();
                            body.appendChild(el('div', { className: 'sub-card' }, [
                                el('div', { className: 'sub-card-head' }, [nameInput, smallButton('Quitar repositorio', () => { repos.splice(index, 1); redraw(); })]),
                                row('Nombres de las carpetas', [naming]),
                                el('div', { className: 'folders-layout' }, [
                                    el('div', {}, [el('div', { className: 'help', text: 'Carpetas obligatorias (rutas desde la raíz del repositorio)' }), area, count]),
                                    el('div', {}, [el('div', { className: 'help', text: 'Así queda la estructura' }), tree]),
                                ]),
                            ]));
                        });

                        body.appendChild(smallButton('+ Agregar repositorio', () => { repos.push({ name: '', naming: 'none', requiredFolders: [] }); redraw(); }));
                    }

                    //deja limpios los valores de los editores (sin renglones vacios ni repetidos) y regresa el primer problema que encuentre, o null
                    function finalizeEditors(name, values) {
                        const keys = Object.keys(data.fieldEditors).filter(key => key.indexOf(name + '.') === 0);
                        for (let i = 0; i < keys.length; i++) {
                            const path = keys[i].slice(name.length + 1).split('.');
                            const current = getAt(values, path);
                            if (current === undefined) { continue; }
                            const editor = data.fieldEditors[keys[i]];

                            if (editor === 'commitTitle') {
                                if (testPattern(current, '') === null) { return 'El formato del título no es una expresión regular válida.'; }
                            } else if (editor === 'patterns') {
                                const cleaned = current.map(item => item.trim()).filter(item => item !== '');
                                for (let j = 0; j < cleaned.length; j++) {
                                    if (testPattern(cleaned[j], '') === null) { return 'El patrón "' + cleaned[j] + '" no es una expresión regular válida.'; }
                                }
                                setAt(values, path, cleaned.filter((item, index) => cleaned.indexOf(item) === index));
                            } else if (editor === 'layers') {
                                const layers = [];
                                for (let j = 0; j < current.length; j++) {
                                    const layerName = String(current[j].name || '').trim();
                                    const folders = (current[j].folders || []).map(item => item.trim().toLowerCase()).filter(item => item !== '');
                                    if (layerName === '') { return 'La capa ' + (j + 1) + ' necesita un nombre.'; }
                                    if (folders.length === 0) { return 'La capa "' + layerName + '" necesita al menos un nombre de carpeta.'; }
                                    const layer = { name: layerName, folders: folders, required: current[j].required === true };
                                    if (current[j].requiredIfDatabaseDetected === true) { layer.requiredIfDatabaseDetected = true; }
                                    layers.push(layer);
                                }
                                setAt(values, path, layers);
                            } else if (editor === 'folderRepos') {
                                const repos = [];
                                const seen = {};
                                for (let j = 0; j < current.length; j++) {
                                    const repoName = String(current[j].name || '').trim();
                                    if (repoName === '') { return 'El repositorio ' + (j + 1) + ' necesita un nombre.'; }
                                    if (seen[repoName.toLowerCase()]) { return 'El repositorio "' + repoName + '" está repetido.'; }
                                    seen[repoName.toLowerCase()] = true;
                                    const folders = (current[j].requiredFolders || []).map(item => item.trim()).filter(item => item !== '');
                                    repos.push({ name: repoName, naming: current[j].naming, requiredFolders: folders.filter((item, index) => folders.indexOf(item) === index) });
                                }
                                setAt(values, path, repos);
                            }
                        }
                        return null;
                    }

                    //junta lo capturado y se lo manda a la extension, que lo valida, lo firma y lo guarda
                    function save() {
                        const rules = {};
                        let problem = null;

                        Object.keys(state.rules).forEach(name => {
                            if (problem) { return; }
                            const edits = [];
                            walk(state.rules[name], [], (path, value, kind) => {
                                if (problem) { return; }
                                if (isEditorField(name, path)) { return; } //su valor ya esta armado, se limpia en finalizeEditors
                                const key = name + '.' + path.join('.');
                                const label = infoOf(name).name + ' › ' + labelFor(name, path);
                                if (kind === 'number' && (!Number.isInteger(value) || value < 0)) { problem = { rule: name, text: label + ' debe ser un número entero mayor o igual a 0.' }; }
                                else if (kind === 'lines') { edits.push([path, toLines(state.texts[key])]); }
                                else if (kind === 'json') {
                                    try { edits.push([path, JSON.parse(state.texts[key])]); }
                                    catch (error) { problem = { rule: name, text: label + ': el JSON no es válido.' }; }
                                }
                            });
                            if (problem) { return; }
                            const values = clone(state.rules[name]);
                            edits.forEach(edit => setAt(values, edit[0], edit[1]));
                            const editorProblem = finalizeEditors(name, values);
                            if (editorProblem) { problem = { rule: name, text: infoOf(name).name + ': ' + editorProblem }; return; }
                            rules[name] = values;
                        });

                        //si hay un error se abre la tarjeta que lo tiene y se limpia la busqueda para que se vea
                        if (problem) {
                            state.expanded[problem.rule] = true;
                            state.query = '';
                            state.scope = 'all';
                            state.closedGroups[state.priorities[problem.rule] || 'General'] = false;
                            renderStandards();
                            setStatus(problem.text, true);
                            const card = document.querySelector('[data-card="' + problem.rule + '"]');
                            if (card && card.scrollIntoView) { card.scrollIntoView({ block: 'center' }); }
                            return;
                        }

                        lastSent = { rules: rules, priorities: clone(state.priorities), exclude: toLines(state.exclude) };
                        setStatus('Guardando...', false);
                        vscode.postMessage({ command: 'save', rules: lastSent.rules, priorities: lastSent.priorities, exclude: lastSent.exclude });
                    }

                    //lo guardado pasa a ser la base a la que regresa "Descartar cambios"
                    function onSaved() {
                        if (lastSent) { data.rules = lastSent.rules; data.priorities = lastSent.priorities; data.exclude = lastSent.exclude; }
                        setStatus('Guardado. Ya aplica para todo el equipo.', false);
                    }

                    function onPasswordChanged() {
                        data.protectedMode = true;
                        state.passwordOpen = false;
                        renderStandards();
                        setStatus('Contraseña del gerente actualizada.', false);
                    }

                    function onPasswordError(text) {
                        if (!passwordStatusBox) { return; }
                        passwordStatusBox.textContent = text;
                        passwordStatusBox.className = 'status error';
                    }

                    // ------------------------------------------------------------------ pestañas: Estandares e Historial

                    //las dos pestañas viven en el mismo panel
                    function render() {
                        root.textContent = '';
                        root.appendChild(el('div', { className: 'tabs' }, [tabButton('standards', 'Estándares'), tabButton('history', 'Historial')]));
                        standardsBox = el('div');
                        historyBox = el('div');
                        root.appendChild(standardsBox);
                        root.appendChild(historyBox);
                        renderStandards();
                        renderHistory();
                        showTab(activeTab);
                    }

                    function tabButton(tab, title) {
                        const button = el('button', { className: 'tab-button', text: title, dataset: { tab: tab } });
                        button.addEventListener('click', () => showTab(tab));
                        return button;
                    }

                    function showTab(tab) {
                        activeTab = tab;
                        standardsBox.hidden = tab !== 'standards';
                        historyBox.hidden = tab !== 'history';
                        document.querySelectorAll('.tab-button').forEach(button => {
                            button.classList.toggle('active', button.dataset.tab === tab);
                        });
                        if (tab === 'history' && data.historyEnabled && !historyState.loaded && !historyState.loading) { loadHistory(); }
                    }

                    // ------------------------------------------------------------------ historial

                    const PAGE_SIZE = 10;
                    //lo que se ve en la pestaña Historial: filtros, resumen, PR cargados y cuales estan abiertos
                    const historyState = { loaded: false, loading: false, repos: [], repoId: '', state: 'all', days: 30, search: '', summary: null, cycles: [], total: 0, version: 0, expanded: {}, commits: {}, selected: {}, findings: {}, timer: null };
                    const pendingRequests = {};
                    let nextRequestId = 0;
                    let repoSelect = null;
                    let historyStatus = null;
                    let summaryBox = null;
                    let cyclesBox = null;
                    let moreBox = null;

                    //le pide algo a la extension (que consulta la API) y regresa una promesa con la respuesta
                    function askHistory(query, params) {
                        return new Promise((resolve, reject) => {
                            nextRequestId += 1;
                            pendingRequests[nextRequestId] = { resolve: resolve, reject: reject };
                            vscode.postMessage({ command: 'historyRequest', id: nextRequestId, query: query, params: params || {} });
                        });
                    }

                    function onHistoryResponse(message) {
                        const pending = pendingRequests[message.id];
                        if (!pending) { return; }
                        delete pendingRequests[message.id];
                        if (message.ok) { pending.resolve(message.data); } else { pending.reject(new Error(message.error)); }
                    }

                    function option(value, text, selected) { return el('option', { value: value, text: text, selected: !!selected }); }
                    function chip(className, text) { return el('span', { className: 'chip ' + className, text: String(text) }); }

                    function formatDate(iso, utc) {
                        if (!iso) { return ''; }
                        const options = { day: 'numeric', month: 'short' };
                        if (utc) { options.timeZone = 'UTC'; }
                        return new Date(iso).toLocaleDateString('es-MX', options);
                    }

                    function dateRange(cycle) {
                        const first = formatDate(cycle.firstAnalyzedAt);
                        const last = formatDate(cycle.lastAnalyzedAt);
                        return first === last ? first : first + ' al ' + last;
                    }

                    //arma la pestaña una sola vez, los filtros no se vuelven a crear para no perder lo que se esta escribiendo
                    function renderHistory() {
                        historyBox.textContent = '';
                        if (!data.historyEnabled) {
                            historyBox.appendChild(el('div', { className: 'banner', text: 'El historial todavía no está configurado. Pon la dirección de la API en HISTORY_API_URL (src/engine/history/historyConfig.ts) y publica la extensión.' }));
                            return;
                        }

                        repoSelect = el('select', {}, [option('', 'Todos los repos', true)]);
                        const stateSelect = el('select', {}, [option('all', 'Todos', true), option('open', 'Abiertos'), option('merged', 'Mergeados')]);
                        const daysSelect = el('select', {}, [option('7', 'Últimos 7 días'), option('30', 'Últimos 30 días', true), option('90', 'Últimos 90 días')]);
                        const searchBox = el('input', { type: 'search', placeholder: 'Buscar rama, commit o autor' });
                        searchBox.setAttribute('aria-label', 'Buscar en el historial');
                        const refreshButton = el('button', { className: 'secondary', text: 'Actualizar' });

                        repoSelect.addEventListener('change', () => { historyState.repoId = repoSelect.value; refreshAll(); });
                        stateSelect.addEventListener('change', () => { historyState.state = stateSelect.value; runHistory(reloadCycles(true)); });
                        daysSelect.addEventListener('change', () => { historyState.days = Number(daysSelect.value); runHistory(reloadSummary()); });
                        searchBox.addEventListener('input', () => {
                            clearTimeout(historyState.timer);
                            historyState.timer = setTimeout(() => { historyState.search = searchBox.value.trim(); runHistory(reloadCycles(true)); }, 300);
                        });
                        refreshButton.addEventListener('click', () => { loadHistory(); });

                        historyBox.appendChild(el('div', { className: 'toolbar' }, [repoSelect, stateSelect, daysSelect, searchBox, refreshButton]));
                        historyStatus = el('div');
                        summaryBox = el('div');
                        cyclesBox = el('div');
                        moreBox = el('div', { className: 'more' });
                        [historyStatus, summaryBox, cyclesBox, moreBox].forEach(box => historyBox.appendChild(box));
                    }

                    //un error al consultar se muestra en la pestaña con un boton para reintentar
                    function showHistoryError(error) {
                        historyStatus.textContent = '';
                        historyStatus.appendChild(el('div', { className: 'banner', text: 'No se pudo cargar el historial: ' + error.message }));
                        const retry = el('button', { className: 'secondary', text: 'Reintentar' });
                        retry.addEventListener('click', () => { loadHistory(); });
                        historyStatus.appendChild(retry);
                    }

                    //corre una consulta y si falla muestra el error
                    function runHistory(promise) { promise.catch(showHistoryError); }

                    function fillRepoSelect() {
                        repoSelect.textContent = '';
                        repoSelect.appendChild(option('', 'Todos los repos', historyState.repoId === ''));
                        historyState.repos.forEach(repo => repoSelect.appendChild(option(String(repo.id), repo.name, String(repo.id) === historyState.repoId)));
                    }

                    async function loadHistory() {
                        historyState.loading = true;
                        historyStatus.textContent = 'Cargando historial...';
                        try {
                            historyState.repos = await askHistory('repos');
                            fillRepoSelect();
                            await Promise.all([reloadSummary(), reloadCycles(true)]);
                            historyState.loaded = true;
                            historyStatus.textContent = '';
                        } catch (error) {
                            showHistoryError(error);
                        } finally {
                            historyState.loading = false;
                        }
                    }

                    function refreshAll() { runHistory(Promise.all([reloadSummary(), reloadCycles(true)])); }

                    async function reloadSummary() {
                        const params = { days: historyState.days };
                        if (historyState.repoId !== '') { params.repoId = Number(historyState.repoId); }
                        historyState.summary = await askHistory('summary', params);
                        renderSummary();
                    }

                    //carga la primera pagina de PR (reset) o la siguiente; si los filtros cambian mientras llega la respuesta, se ignora
                    async function reloadCycles(reset) {
                        if (reset) { historyState.cycles = []; historyState.total = 0; historyState.version += 1; }
                        const version = historyState.version;
                        const params = { state: historyState.state, search: historyState.search, limit: PAGE_SIZE, offset: historyState.cycles.length };
                        if (historyState.repoId !== '') { params.repoId = Number(historyState.repoId); }
                        const page = await askHistory('cycles', params);
                        if (version !== historyState.version) { return; }
                        historyState.cycles = historyState.cycles.concat(page.items);
                        historyState.total = page.total;
                        renderCycles();
                    }

                    // ---- resumen (indicadores, tendencia y reglas mas incumplidas)

                    function metric(label, value, extras, tone) {
                        return el('div', { className: 'metric' }, [
                            el('div', { className: 'metric-label', text: label }),
                            el('div', { className: 'metric-value' + (tone ? ' ' + tone : ''), text: String(value) }),
                            el('div', { className: 'metric-extra' }, extras),
                        ]);
                    }

                    function renderSummary() {
                        const summary = historyState.summary;
                        summaryBox.textContent = '';
                        if (!summary) { return; }

                        const delta = summary.resolved - summary.resolvedPrevious;
                        const deltaText = delta > 0 ? '+' + delta + ' vs. periodo anterior' : delta < 0 ? '−' + Math.abs(delta) + ' vs. periodo anterior' : 'igual que el periodo anterior';
                        summaryBox.appendChild(el('div', { className: 'metrics' }, [
                            metric('Abiertos ahora', summary.open.total, [chip('Alta', summary.open.Alta), chip('Media', summary.open.Media), chip('Baja', summary.open.Baja)]),
                            metric('Corregidos', summary.resolved, [el('span', { text: deltaText })], 'good'),
                            metric('Llegaron a main', summary.reachedMain, [el('span', { text: 'sin corregir' })], 'bad'),
                            metric('Commits analizados', summary.commitCount, [el('span', { text: 'en ' + summary.cycleCount + ' PR' })]),
                        ]));
                        summaryBox.appendChild(renderTrend(summary.weekly));
                        summaryBox.appendChild(renderTopRules(summary.topRules));
                    }

                    function renderTrend(weekly) {
                        const peak = Math.max(1, ...weekly.map(week => Math.max(week.detected, week.resolved)));
                        const box = el('div', { className: 'box' }, [el('div', { className: 'box-title', text: 'Tendencia semanal' })]);
                        const trend = el('div', { className: 'trend' });
                        weekly.forEach(week => {
                            const detected = el('span', { className: 'bar-detected', title: week.detected + ' detectados' });
                            const resolved = el('span', { className: 'bar-resolved', title: week.resolved + ' corregidos' });
                            detected.style.height = Math.round(week.detected / peak * 92) + 'px';
                            resolved.style.height = Math.round(week.resolved / peak * 92) + 'px';
                            trend.appendChild(el('div', { className: 'week' }, [
                                el('div', { className: 'pair' }, [detected, resolved]),
                                el('span', { className: 'muted', text: formatDate(week.weekStart + 'T00:00:00Z', true) }),
                            ]));
                        });
                        box.appendChild(trend);
                        box.appendChild(el('div', { className: 'legend' }, [
                            el('span', { className: 'swatch bar-detected' }), el('span', { text: 'Detectados' }),
                            el('span', { className: 'swatch bar-resolved' }), el('span', { text: 'Corregidos' }),
                        ]));
                        return box;
                    }

                    function renderTopRules(topRules) {
                        const box = el('div', { className: 'box' }, [el('div', { className: 'box-title', text: 'Reglas más incumplidas' })]);
                        if (topRules.length === 0) {
                            box.appendChild(el('div', { className: 'muted', text: 'Todavía no hay hallazgos registrados en este periodo.' }));
                            return box;
                        }

                        const peak = topRules[0].count;
                        topRules.forEach(item => {
                            const priority = state.priorities[item.rule];
                            const fill = el('span');
                            fill.style.width = Math.round(item.count / peak * 100) + '%';
                            const configure = el('button', { className: 'secondary', text: 'Configurar' });
                            configure.addEventListener('click', () => goConfigure(item.rule));
                            box.appendChild(el('div', { className: 'rule-row' }, [
                                el('span', { text: infoOf(item.rule).name }),
                                priority ? chip(priority, priority) : el('span'),
                                el('div', { className: 'track' }, [fill]),
                                el('span', { className: 'muted', text: String(item.count) }),
                                configure,
                            ]));
                        });
                        return box;
                    }

                    //lleva a la pestaña Estandares filtrada por la regla para cambiar su prioridad o desactivarla
                    function goConfigure(rule) {
                        state.query = rule;
                        state.scope = 'all';
                        renderStandards();
                        showTab('standards');
                    }

                    // ---- PR (ciclos): tarjetas con su embudo, commits y hallazgos

                    //con "Todos los repos" cada PR muestra a que repositorio pertenece
                    function repoChip(repoName) {
                        const badge = chip('repo-chip', repoName);
                        badge.title = 'Repositorio';
                        return badge;
                    }

                    function cycleKey(cycle) { return cycle.repoId + '|' + cycle.branch + '|' + (cycle.pullRequestId === null ? 'open' : cycle.pullRequestId); }

                    function renderCycles() {
                        cyclesBox.textContent = '';
                        moreBox.textContent = '';
                        if (historyState.cycles.length === 0) {
                            cyclesBox.appendChild(el('div', { className: 'empty', text: 'No hay PR que coincidan con los filtros.' }));
                            return;
                        }
                        historyState.cycles.forEach(cycle => cyclesBox.appendChild(renderCycle(cycle)));
                        if (historyState.cycles.length < historyState.total) {
                            const more = el('button', { className: 'secondary', text: 'Cargar más' });
                            more.addEventListener('click', () => { runHistory(reloadCycles(false)); });
                            moreBox.appendChild(more);
                        }
                    }

                    function renderCycle(cycle) {
                        const key = cycleKey(cycle);
                        const isOpen = !!historyState.expanded[key];
                        const head = el('div', { className: 'cycle-head' }, [
                            el('span', { className: 'cycle-chevron', text: isOpen ? '▾' : '▸' }),
                            el('span', { className: 'mono', text: cycle.branch }),
                            chip('state-' + cycle.state, cycle.state === 'open' ? 'Abierto' : 'Mergeado'),
                            historyState.repoId === '' ? repoChip(cycle.repoName) : el('span'),
                            el('span', { className: 'cycle-meta', text: cycle.commitCount + (cycle.commitCount === 1 ? ' commit' : ' commits') + ' · ' + dateRange(cycle) }),
                        ]);
                        head.addEventListener('click', () => toggleCycle(cycle));
                        const card = el('div', { className: 'cycle' }, [head, renderFunnel(cycle)]);
                        if (isOpen) { card.appendChild(renderCycleBody(cycle, key)); }
                        return card;
                    }

                    function funnelNumber(value, label, tone) {
                        return el('div', {}, [
                            el('div', { className: 'funnel-number' + (tone ? ' ' + tone : ''), text: String(value) }),
                            el('div', { className: 'muted', text: label }),
                        ]);
                    }

                    //detectados, corregidos y los que quedaron (abiertos ahora, o los que llegaron a main si el PR ya se mergeo)
                    function renderFunnel(cycle) {
                        const bySeverity = cycle.detectedBySeverity;
                        const total = Math.max(1, cycle.detected);
                        const bar = el('div', { className: 'sev' });
                        [['Alta', '#ff5a5a'], ['Media', '#ffc83c'], ['Baja', '#64b4ff']].forEach(pair => {
                            const segment = el('span');
                            segment.style.width = (bySeverity[pair[0]] / total * 100) + '%';
                            segment.style.background = pair[1];
                            bar.appendChild(segment);
                        });
                        const isOpen = cycle.state === 'open';
                        return el('div', { className: 'funnel' }, [
                            funnelNumber(cycle.detected, 'Detectados'),
                            el('span', { className: 'muted', text: '→' }),
                            funnelNumber(cycle.resolved, 'Corregidos', 'good'),
                            el('span', { className: 'muted', text: '→' }),
                            funnelNumber(cycle.unresolved, isOpen ? 'Abiertos ahora' : 'Llegaron a main', isOpen ? '' : 'bad'),
                            el('div', { className: 'funnel-bar' }, [bar, el('div', { className: 'muted', text: 'Detectados: Alta ' + bySeverity.Alta + ' · Media ' + bySeverity.Media + ' · Baja ' + bySeverity.Baja })]),
                        ]);
                    }

                    function toggleCycle(cycle) {
                        const key = cycleKey(cycle);
                        historyState.expanded[key] = !historyState.expanded[key];
                        renderCycles();
                        if (historyState.expanded[key] && !historyState.commits[key]) { loadCommits(cycle, key); }
                    }

                    //al abrir un PR se cargan sus commits y se selecciona el ultimo para mostrar sus hallazgos
                    async function loadCommits(cycle, key) {
                        historyState.commits[key] = { loading: true };
                        renderCycles();
                        try {
                            const commits = await askHistory('commits', { repoId: cycle.repoId, branch: cycle.branch, pullRequestId: cycle.pullRequestId });
                            historyState.commits[key] = { items: commits };
                            if (commits.length > 0 && !historyState.selected[key]) { historyState.selected[key] = commits[commits.length - 1].analysisId; }
                            renderCycles();
                            if (historyState.selected[key]) { loadFindings(historyState.selected[key]); }
                        } catch (error) {
                            historyState.commits[key] = { error: error.message };
                            renderCycles();
                        }
                    }

                    async function loadFindings(analysisId) {
                        const existing = historyState.findings[analysisId];
                        if (existing && !existing.error) { return; }
                        historyState.findings[analysisId] = { loading: true };
                        renderCycles();
                        try {
                            historyState.findings[analysisId] = { items: await askHistory('findings', { analysisId: analysisId }) };
                        } catch (error) {
                            historyState.findings[analysisId] = { error: error.message };
                        }
                        renderCycles();
                    }

                    function selectCommit(key, analysisId) {
                        historyState.selected[key] = analysisId;
                        renderCycles();
                        loadFindings(analysisId);
                    }

                    function renderCycleBody(cycle, key) {
                        const body = el('div', { className: 'cycle-body' });
                        body.appendChild(el('div', { className: 'muted', text: 'Repositorio: ' + cycle.repoName + ' · Rama: ' + cycle.branch + (cycle.state === 'merged' ? ' · PR mergeado' : ' · PR abierto') }));
                        const commits = historyState.commits[key];
                        if (!commits || commits.loading) { body.appendChild(el('div', { className: 'muted', text: 'Cargando commits...' })); return body; }
                        if (commits.error) { body.appendChild(el('div', { className: 'status error', text: 'No se pudieron cargar los commits: ' + commits.error })); return body; }
                        if (commits.items.length === 0) { body.appendChild(el('div', { className: 'muted', text: 'Este PR no tiene commits registrados.' })); return body; }

                        body.appendChild(el('div', { className: 'commit-row header' }, [el('span', { text: 'Commit' }), el('span', { text: 'Mensaje y autor' }), el('span', { text: 'Abiertos A / M / B' }), el('span', { text: 'Cambio' })]));
                        commits.items.forEach(commit => {
                            const row = el('div', { className: 'commit-row' + (historyState.selected[key] === commit.analysisId ? ' selected' : '') }, [
                                el('span', { className: 'mono', text: commit.commitHash.slice(0, 7) }),
                                el('span', {}, [el('div', { text: commit.subject || '(sin mensaje)' }), el('div', { className: 'muted', text: commit.authorName + ' · ' + formatDate(commit.analyzedAt) })]),
                                el('span', {}, [chip('Alta', commit.open.Alta), document.createTextNode(' '), chip('Media', commit.open.Media), document.createTextNode(' '), chip('Baja', commit.open.Baja)]),
                                el('span', { className: 'muted', text: '+' + commit.newCount + ' −' + commit.resolvedCount }),
                            ]);
                            row.addEventListener('click', () => selectCommit(key, commit.analysisId));
                            body.appendChild(row);
                        });

                        const selected = commits.items.find(commit => commit.analysisId === historyState.selected[key]);
                        if (selected) { body.appendChild(renderFindings(selected)); }
                        return body;
                    }

                    //hallazgos del commit elegido, cada uno con su estado: nuevo, persiste o resuelto en ese commit
                    function renderFindings(commit) {
                        const box = el('div', { className: 'box' });
                        box.appendChild(el('div', { className: 'box-title' }, [el('span', { text: 'Hallazgos en ' }), el('span', { className: 'mono', text: commit.commitHash.slice(0, 7) })]));

                        const loaded = historyState.findings[commit.analysisId];
                        if (!loaded || loaded.loading) { box.appendChild(el('div', { className: 'muted', text: 'Cargando hallazgos...' })); return box; }
                        if (loaded.error) { box.appendChild(el('div', { className: 'status error', text: 'No se pudieron cargar los hallazgos: ' + loaded.error })); return box; }
                        if (loaded.items.length === 0) { box.appendChild(el('div', { className: 'muted', text: 'En este commit no había hallazgos.' })); return box; }

                        const labels = { new: 'Nuevo', persisting: 'Persiste', resolved: 'Resuelto' };
                        loaded.items.forEach(item => {
                            box.appendChild(el('div', { className: 'finding-row' + (item.status === 'resolved' ? ' resolved' : '') }, [
                                el('span', { className: 'mono', text: item.file + (item.line ? ':' + item.line : '') }),
                                el('span', { className: 'finding-rule', text: infoOf(item.rule).name, title: item.message }),
                                chip(item.severity, item.severity),
                                chip('status-' + item.status, labels[item.status] || item.status),
                            ]));
                        });
                        return box;
                    }

                    //avisa a la extension que la pagina ya esta escuchando para que le mande la configuracion
                    vscode.postMessage({ command: 'ready' });
                </script>
            </body>
            </html>`;
}
