// ----------------------------------------------------------------------------------------------------
// ---- CLIENTE DE LA CONTRASEÑA DEL GERENTE: VERIFICA Y CAMBIA CONTRA LA API --------------------------
// ----------------------------------------------------------------------------------------------------

import { HISTORY_API_TOKEN, HISTORY_API_URL } from '../history/historyConfig';

const TIMEOUT_MS = 5000;

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
    } catch (error) {
        throw new Error('No se pudo conectar con el backend (' + HISTORY_API_URL + '): ' + (error instanceof Error ? error.message : String(error)));
    } finally {
        clearTimeout(timer);
    }
}

//false si la API no esta configurada: sin backend no hay proteccion posible
export async function isManagerProtected(): Promise<boolean> {
    if (!isEnabled()) { return false; }
    const response = await request('GET', '/api/manager/protected');
    return (response.data as { protectedMode?: boolean } | undefined)?.protectedMode ?? false;
}

export async function verifyManagerPassword(password: string): Promise<boolean> {
    if (!isEnabled()) { return true; }
    const response = await request('POST', '/api/manager/verify', { password });
    return response.ok && (response.data as { ok?: boolean } | undefined)?.ok === true;
}

//cambia la contraseña del gerente; lanza error con el mensaje de la API si no se pudo (ej. la actual no coincide)
export async function changeManagerPassword(currentPassword: string | undefined, newPassword: string): Promise<void> {
    if (!isEnabled()) { throw new Error('HISTORY_API_URL esta vacia, no hay a donde guardar la contraseña'); }
    const response = await request('POST', '/api/manager/password', { currentPassword, newPassword });
    if (!response.ok) {
        const apiMessage = (response.data as { error?: string } | undefined)?.error;
        throw new Error(apiMessage ?? `La API respondio ${response.status}`);
    }
}
