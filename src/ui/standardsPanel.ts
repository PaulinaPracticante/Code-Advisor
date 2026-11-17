// ----------------------------------------------------------------------------------------------------
// ---- PANEL "CONFIGURAR ESTANDARES", SOLO PARA EL GERENTE -------------------------------------------
// ----------------------------------------------------------------------------------------------------

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { RULE_PRIORITIES, loadConfig } from '../engine/config/configLoader';
import { MANAGER_PASSWORD_HASH } from '../engine/config/managerKey';
import { prepareConfigContent } from '../engine/config/configEditor';
import { EXCLUDE_INFO, PARAM_LABELS, RULE_CATALOG } from '../engine/config/ruleCatalog';
import { getHistory } from '../engine/history/historyClient';


let currentPanel: vscode.WebviewPanel | undefined; //el panel abierto, solo puede haber uno

//Genera strig aleatorio de 32 caracteres
function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) { text += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return text;
}

function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password, 'utf-8').digest('hex');
}
//revisa que este equipo tenga la llave del gerente y que sea la misma cuya llave publica esta dentro de la extension
async function checkManagerAccess(): Promise<{ ok: true } | { error: string }> {
    if (MANAGER_PASSWORD_HASH === '') { return { ok: true }; }

    const password = await vscode.window.showInputBox({
        prompt: 'Contraseña de gerente para configurar los estandares',
        password: true,
        ignoreFocusOut: true,
    });
    if (password === undefined) { return { error: '' }; }

    if (hashPassword(password) !== MANAGER_PASSWORD_HASH) {
        return { error: 'Contraseña incorrecta. '};
    }
    return { ok: true };
}

async function setManagerPassword(): Promise<void> {
    const password = await vscode.window.showInputBox({
        prompt: 'Nueva contraseña de gerente',
        password: true,
        ignoreFocusOut: true,
    });
    if (password === undefined || password === '') { return; }

    const hash = hashPassword(password); 
    const copy = await vscode.window.showInformationMessage(
        'Pega este hash en MANAGER_PASSWORD_HASH (src/engine/config/managerKey.ts) y publica la extensión para que el panel pida esta contraseña.',
        'Copiar hash'
    );
    if (copy === 'Copiar hash') { await vscode.env.clipboard.writeText(hash); }
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

    const text = 'export const GLOBAL_STANDARS: Record<string, unknown> = ' + JSON.stringify(prepared.content, null, 4) + ';\n';
    await vscode.env.clipboard.writeText(text);
    void panel.webview.postMessage({ command: 'saved' });
    void vscode.window.showInformationMessage('Se copió al portapapeles. Pégalo en GLOBAL_STANDARDS (src/engine/config/globalStandards.ts) y publica la extensión para que aplique en todos los repos del equipo.');
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
                protectedMode: MANAGER_PASSWORD_HASH !== '',
                historyEnabled: getHistory()?.isEnabled() ?? false,
                exclude: config.exclude,
                rules: config.rules,
                priorities: { ...RULE_PRIORITIES, ...config.priorities },
                catalog: { ...RULE_CATALOG, __exclude: EXCLUDE_INFO }, //nombre y descripcion en español de cada regla
                paramLabels: PARAM_LABELS,
            });
        }
        if (message.command === 'save') {
            await saveStandards(panel, message);
        }
        if (message.command === 'historyRequest') {
            await answerHistoryRequest(panel, message);
        }
    });
}

//registra los comandos del gerente
export function registerStandardsCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('codeadvisor.setManagerPassword', () => setManagerPassword()),
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
                input[type=text], input[type=number], input[type=search], textarea, select { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, var(--vscode-widget-border)); padding: 4px 6px; font-family: inherit; font-size: inherit; }
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
                    const state = { rules: {}, priorities: {}, texts: {}, expanded: {}, closedGroups: {}, query: '', exclude: '' };

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'load') { data = message; resetState(); render(); }
                        if (message.command === 'saved') { onSaved(); }
                        if (message.command === 'error') { setStatus(message.message, true); }
                        if (message.command === 'historyResponse') { onHistoryResponse(message); }
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

                    function toText(value, kind) { return kind === 'lines' ? value.join('\\n') : JSON.stringify(value, null, 2); }
                    function toLines(text) { return text.split('\\n').map(line => line.trim()).filter(line => line !== ''); }
                    function normalize(text) { return String(text).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, ''); }

                    function infoOf(name) { return data.catalog[name] || { name: name, description: '' }; }

                    //nombre en español del parametro, si no esta en el catalogo se muestra su nombre tecnico
                    function labelFor(rule, path) {
                        const last = path[path.length - 1];
                        return data.paramLabels[rule + '.' + path.join('.')] || data.paramLabels['*.' + last] || last;
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
                                if (kind === 'lines' || kind === 'json') { state.texts[name + '.' + path.join('.')] = toText(value, kind); }
                            });
                        });
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
                        return names.filter(matches).sort((a, b) => infoOf(a).name.localeCompare(infoOf(b).name, 'es'));
                    }

                    //dibuja la pestaña de estandares dentro de su contenedor (root se redefine aqui para no tocar el resto de la funcion)
                    function renderStandards() {
                        const root = standardsBox;
                        root.textContent = '';
                        root.appendChild(el('h2', { text: 'Estándares del equipo' }));
                        if (!data.protectedMode) {
                            root.appendChild(el('div', { className: 'banner', text: 'La extensión todavía no trae la contraseña del gerente, por eso la configuración aún no está protegida. Usa el comando "Establecer contraeña del Gerente".' }));
                        }
                        root.appendChild(el('p', { className: 'hint', text: 'Al guardar se escribe directo en el archivo.Protege que no se abra en el panel sin la contraseña.' }));

                        const search = el('input', { type: 'search', placeholder: 'Buscar una regla por nombre o descripción...', value: state.query });
                        search.setAttribute('aria-label', 'Buscar regla');
                        search.addEventListener('input', () => { state.query = search.value; renderGroups(); });
                        root.appendChild(search);

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
                            el('div', { className: 'card-name', text: info.name }),
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
                            if (kind === 'object') {
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
                            input = el('input', { type: 'number', value: String(value) });
                            input.addEventListener('input', () => { setAt(state.rules[name], path, input.value.trim() === '' ? NaN : Number(input.value)); });
                        } else if (kind === 'string') {
                            input = el('input', { type: 'text', value: value });
                            input.addEventListener('input', () => { setAt(state.rules[name], path, input.value); });
                        } else {
                            input = el('textarea', { rows: kind === 'lines' ? Math.max(2, Math.min(8, value.length)) : 8, value: state.texts[key], placeholder: kind === 'lines' ? 'Uno por línea' : 'JSON' });
                            input.addEventListener('input', () => { state.texts[key] = input.value; });
                        }
                        return input;
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
                                const key = name + '.' + path.join('.');
                                const label = infoOf(name).name + ' › ' + labelFor(name, path);
                                if (kind === 'number' && isNaN(value)) { problem = { rule: name, text: label + ' debe ser un número.' }; }
                                else if (kind === 'lines') { edits.push([path, toLines(state.texts[key])]); }
                                else if (kind === 'json') {
                                    try { edits.push([path, JSON.parse(state.texts[key])]); }
                                    catch (error) { problem = { rule: name, text: label + ': el JSON no es válido.' }; }
                                }
                            });
                            if (problem) { return; }
                            const values = clone(state.rules[name]);
                            edits.forEach(edit => setAt(values, edit[0], edit[1]));
                            rules[name] = values;
                        });

                        //si hay un error se abre la tarjeta que lo tiene y se limpia la busqueda para que se vea
                        if (problem) {
                            state.expanded[problem.rule] = true;
                            state.query = '';
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
                        setStatus('Copiado al portapapeles. Pégalo en globalStandards.ts y publica la extensión.', false);
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
                        renderStandards();
                        showTab('standards');
                    }

                    // ---- PR (ciclos): tarjetas con su embudo, commits y hallazgos

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
                            el('span', { className: 'muted', text: historyState.repoId === '' && historyState.repos.length > 1 ? cycle.repoName : '' }),
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
