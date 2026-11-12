// ----------------------------------------------------------------------------------------------------
// ---- PANEL "CONFIGURAR ESTANDARES", SOLO PARA EL GERENTE (SIN LOGIN, CON FIRMA DIGITAL) -----------
// ----------------------------------------------------------------------------------------------------

import * as vscode from 'vscode';
import { CONFIG_FILE_NAME, RULE_PRIORITIES, loadConfig } from '../engine/config/configLoader';
import { MANAGER_PUBLIC_KEY } from '../engine/config/managerKey';
import { buildSignedConfigText, derivePublicKey, generateManagerKeyPair } from '../engine/config/configSignature';
import { prepareConfigContent } from '../engine/config/configEditor';
import { getManagerKeyPath, readManagerPrivateKey, saveManagerKey } from '../engine/config/managerKeyStore';
import { EXCLUDE_INFO, PARAM_LABELS, RULE_CATALOG } from '../engine/config/ruleCatalog';

//variable de contexto de vscode, con ella el comando "Configurar estandares" solo aparece en la paleta del equipo del gerente
const IS_MANAGER_CONTEXT = 'codeadvisor.isManager';

let currentPanel: vscode.WebviewPanel | undefined; //el panel abierto, solo puede haber uno

//Genera strig aleatorio de 32 caracteres
function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) { text += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return text;
}

//revisa que este equipo tenga la llave del gerente y que sea la misma cuya llave publica esta dentro de la extension
function checkManagerAccess(): { privateKey: string } | { error: string } {
    const privateKey = readManagerPrivateKey();
    if (privateKey === undefined) {
        return { error: 'Solo el gerente puede configurar los estándares: este equipo no tiene la llave de gerente (' + getManagerKeyPath() + ').' };
    }
    try {
        if (MANAGER_PUBLIC_KEY !== '' && derivePublicKey(privateKey) !== MANAGER_PUBLIC_KEY) {
            return { error: 'La llave de gerente de este equipo no corresponde a la llave pública que trae la extensión.' };
        }
    } catch {
        return { error: 'La llave de gerente de este equipo está dañada (' + getManagerKeyPath() + ').' };
    }
    return { privateKey };
}

//actualiza la variable de contexto para mostrar u ocultar el comando de configuracion
function refreshManagerContext(): void {
    void vscode.commands.executeCommand('setContext', IS_MANAGER_CONTEXT, !('error' in checkManagerAccess()));
}

//crea el par de llaves del gerente: la privada se queda en su equipo y la publica se copia para pegarla en la extension
async function createManagerKey(): Promise<void> {
    if (readManagerPrivateKey() !== undefined) {
        const confirm = await vscode.window.showWarningMessage(
            'Este equipo ya tiene una llave de gerente. Si creas otra, la actual se pierde y hay que publicar la extensión con la llave pública nueva.',
            { modal: true },
            'Crear otra llave'
        );
        if (confirm !== 'Crear otra llave') { return; }
    }

    const { privateKeyPem, publicKeyBase64 } = generateManagerKeyPair();
    saveManagerKey(privateKeyPem, publicKeyBase64);
    refreshManagerContext();

    const copy = await vscode.window.showInformationMessage(
        'Llave de gerente creada en ' + getManagerKeyPath() + '. Pega la llave pública en src/engine/config/managerKey.ts y publica la extensión para que los demás equipos validen la configuración. Guarda una copia segura de la llave privada.',
        'Copiar llave pública'
    );
    if (copy === 'Copiar llave pública') { await vscode.env.clipboard.writeText(publicKeyBase64); }
}

//firma y guarda en el proyecto lo que el gerente capturo en el panel
async function saveStandards(panel: vscode.WebviewPanel, folder: vscode.WorkspaceFolder, message: { exclude: unknown; priorities: unknown; rules: unknown }): Promise<void> {
    const access = checkManagerAccess(); //se vuelve a revisar, la llave pudo cambiar con el panel abierto
    if ('error' in access) {
        void panel.webview.postMessage({ command: 'error', message: access.error });
        return;
    }

    const prepared = prepareConfigContent({ exclude: message.exclude, priorities: message.priorities, rules: message.rules });
    if ('error' in prepared) {
        void panel.webview.postMessage({ command: 'error', message: prepared.error });
        return;
    }

    const text = buildSignedConfigText(prepared.content, access.privateKey);
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder.uri, CONFIG_FILE_NAME), Buffer.from(text, 'utf8'));
    void panel.webview.postMessage({ command: 'saved' });
    void vscode.window.showInformationMessage('Configuración firmada y guardada en ' + CONFIG_FILE_NAME + '. Haz commit para compartirla con el equipo.');
}

//abre el panel con la configuracion vigente del proyecto, solo si este equipo tiene la llave del gerente
async function openStandardsPanel(): Promise<void> {
    const access = checkManagerAccess();
    if ('error' in access) {
        void vscode.window.showErrorMessage(access.error);
        return;
    }

    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
        void vscode.window.showErrorMessage('Abra la carpeta del proyecto cuyos estándares quiere configurar');
        return;
    }

    if (currentPanel) {
        currentPanel.reveal();
        return;
    }

    //la configuracion vigente, si el archivo no tiene una firma valida se parte de la de por defecto
    const config = await loadConfig(folder.uri);

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
                project: folder.name,
                protectedMode: MANAGER_PUBLIC_KEY !== '',
                exclude: config.exclude,
                rules: config.rules,
                priorities: { ...RULE_PRIORITIES, ...config.priorities },
                catalog: { ...RULE_CATALOG, __exclude: EXCLUDE_INFO }, //nombre y descripcion en español de cada regla
                paramLabels: PARAM_LABELS,
            });
        }
        if (message.command === 'save') {
            await saveStandards(panel, folder, message);
        }
    });
}

//registra los comandos del gerente
export function registerStandardsCommands(context: vscode.ExtensionContext): void {
    refreshManagerContext();
    context.subscriptions.push(
        vscode.commands.registerCommand('codeadvisor.createManagerKey', () => createManagerKey()),
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
                    //lo que el gerente va capturando; texts guarda el texto de los campos de lista y JSON hasta que se guarda
                    const state = { rules: {}, priorities: {}, texts: {}, expanded: {}, closedGroups: {}, query: '', exclude: '' };

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'load') { data = message; resetState(); render(); }
                        if (message.command === 'saved') { onSaved(); }
                        if (message.command === 'error') { setStatus(message.message, true); }
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

                    function render() {
                        root.textContent = '';
                        root.appendChild(el('h2', { text: 'Estándares de ' + data.project }));
                        if (!data.protectedMode) {
                            root.appendChild(el('div', { className: 'banner', text: 'La extensión todavía no trae la llave pública del gerente, por eso la configuración aún no está protegida. Usa el comando "Crear Llave de Gerente".' }));
                        }
                        root.appendChild(el('p', { className: 'hint', text: 'Al guardar, la configuración se firma con la llave del gerente. Si alguien edita el archivo a mano, la extensión lo ignora y usa la configuración por defecto.' }));

                        const search = el('input', { type: 'search', placeholder: 'Buscar una regla por nombre o descripción...', value: state.query });
                        search.setAttribute('aria-label', 'Buscar regla');
                        search.addEventListener('input', () => { state.query = search.value; renderGroups(); });
                        root.appendChild(search);

                        groupsBox = el('div');
                        root.appendChild(groupsBox);

                        statusBox = el('span', { className: 'status' });
                        const saveButton = el('button', { className: 'primary', text: 'Firmar y guardar' });
                        saveButton.addEventListener('click', save);
                        const discardButton = el('button', { className: 'secondary', text: 'Descartar cambios' });
                        discardButton.addEventListener('click', () => { resetState(); render(); setStatus('Cambios descartados.', false); });
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
                            render();
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
                        setStatus('Configuración firmada y guardada. Haz commit para compartirla con el equipo.', false);
                    }

                    //avisa a la extension que la pagina ya esta escuchando para que le mande la configuracion
                    vscode.postMessage({ command: 'ready' });
                </script>
            </body>
            </html>`;
}
