// ----------------------------------------------------------------------------------------------------
// ---- CLIENTE DE LOS ESTANDARES: LOS TRAE DE LA API (CON CACHE) Y MANDA LOS CAMBIOS DEL PANEL ---------
// ----------------------------------------------------------------------------------------------------

import { HISTORY_API_TOKEN, HISTORY_API_URL } from '../history/historyConfig';

const TIMEOUT_MS = 5000;
const CACHE_MS = 60_000; //no vale la pena consultar la API en cada archivo analizado

let cached: { content: Record<string, unknown>; fetchedAt: number } | undefined;

function isEnabled(): boolean {
    return HISTORY_API_URL !== '';
}

async function request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: unknown }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (HISTORY_API_TOKEN !== '') { headers['x-api-token'] = HISTORY_API_TOKEN; }
        const response = await fetch(HISTORY_API_URL.replace(/\/+$/, '') + path, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: controller.signal,
        });
        let data: unknown;
        try { data = await response.json(); } catch { data = undefined; }
        return { ok: response.ok, status: response.status, data };
    } finally {
        clearTimeout(timer);
    }
}

//los estandares vigentes; si la API no esta configurada o no responde regresa undefined (quien llama decide el respaldo)
export async function fetchStandards(force = false): Promise<Record<string, unknown> | undefined> {
    if (!isEnabled()) { return undefined; }
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_MS) { return cached.content; }

    try {
        const response = await request('GET', '/api/standards');
        if (!response.ok) { return cached?.content; }
        const content = (response.data as { content?: Record<string, unknown> } | undefined)?.content ?? {};
        cached = { content, fetchedAt: Date.now() };
        return content;
    } catch {
        return cached?.content; //sin red se usa lo ultimo que se pudo traer
    }
}

//el panel manda la configuracion nueva; lanza error con el mensaje de la API si no se pudo guardar
export async function pushStandards(content: Record<string, unknown>): Promise<void> {
    if (!isEnabled()) { throw new Error('HISTORY_API_URL esta vacia, no hay a donde guardar los estandares'); }
    const response = await request('POST', '/api/standards', { content });
    if (!response.ok) {
        const apiMessage = (response.data as { error?: string } | undefined)?.error;
        throw new Error(apiMessage ?? `La API respondio ${response.status}`);
    }
    cached = { content, fetchedAt: Date.now() }; //ya no hace falta volver a consultar, se acaba de guardar
}
