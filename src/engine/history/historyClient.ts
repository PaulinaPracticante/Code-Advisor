// ----------------------------------------------------------------------------------------------------
// ---- CLIENTE DE LA API DEL HISTORIAL: MANDA LOS REGISTROS (CON COLA SIN CONEXION) Y LOS CONSULTA ----
// ----------------------------------------------------------------------------------------------------

import { HISTORY_API_TOKEN, HISTORY_API_URL } from './historyConfig';
import type { AnalysisRecord, PullRequestClosure } from './historyTypes';

//donde se guarda la cola de registros pendientes (en la extension es context.globalState)
export interface HistoryStorage {
    get<T>(key: string): T | undefined;
    update(key: string, value: unknown): PromiseLike<void>;
}

export interface HistoryClientOptions {
    baseUrl: string;
    token: string;
    storage: HistoryStorage;
    extensionVersion: string;
    fetchImpl?: typeof fetch; //para pruebas
    timeoutMs?: number;
}

interface QueuedItem {
    id: string;
    type: 'analysis' | 'merge';
    payload: AnalysisRecord | PullRequestClosure;
}

const QUEUE_KEY = 'codeadvisor.historyQueue';
const MAX_QUEUE_SIZE = 300; //si pasa de aqui se descartan los mas viejos
const DEFAULT_TIMEOUT_MS = 8000;

//respuestas que vale la pena reintentar (sin red, servidor caido, token mal puesto, muchas peticiones); 
const RETRY_STATUSES = new Set([401, 403, 408, 429]);

export class HistoryClient {
    private readonly baseUrl: string;
    private readonly token: string;
    private readonly storage: HistoryStorage;
    private readonly fetchImpl: typeof fetch;
    private readonly timeoutMs: number;
    private flushing = false;
    private counter = 0;
    public readonly extensionVersion: string;

    constructor(options: HistoryClientOptions) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, '');
        this.token = options.token;
        this.storage = options.storage;
        this.extensionVersion = options.extensionVersion;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    }

    //sin direccion de la API el historial esta apagado
    public isEnabled(): boolean {
        return this.baseUrl !== '';
    }

    // ------------------------------------------------------------------ escritura

    //guarda el analisis de un commit, nunca lanza error: si no hay conexion queda en la cola y se manda despues
    public async recordAnalysis(record: AnalysisRecord): Promise<void> {
        await this.enqueue('analysis', record);
    }

    //avisa que el PR de una rama se mergeo
    public async recordMerge(closure: PullRequestClosure): Promise<void> {
        await this.enqueue('merge', closure);
    }

    private async enqueue(type: QueuedItem['type'], payload: QueuedItem['payload']): Promise<void> {
        if (!this.isEnabled()) { return; }
        try {
            this.counter += 1;
            const queue = this.readQueue();
            queue.push({ id: Date.now() + '-' + this.counter, type, payload });
            await this.writeQueue(queue.slice(-MAX_QUEUE_SIZE));
            await this.flush();
        } catch (error) {
            console.warn('CodeAdvisor: no se pudo guardar el registro del historial', error);
        }
    }

    //manda la cola en orden (primero los analisis y despues el aviso de merge), se detiene en el primer fallo para reintentar despues
    public async flush(): Promise<void> {
        if (!this.isEnabled() || this.flushing) { return; }
        this.flushing = true;
        try {
            for (;;) {
                const next = this.readQueue()[0];
                if (!next) { break; }
                const outcome = await this.send(next);
                if (outcome === 'retry') { break; }
                await this.writeQueue(this.readQueue().filter(item => item.id !== next.id));
            }
        } catch (error) {
            console.warn('CodeAdvisor: fallo el envio del historial', error);
        } finally {
            this.flushing = false;
        }
    }

    private readQueue(): QueuedItem[] {
        return this.storage.get<QueuedItem[]>(QUEUE_KEY) ?? [];
    }

    private async writeQueue(queue: QueuedItem[]): Promise<void> {
        await this.storage.update(QUEUE_KEY, queue);
    }

    private async send(item: QueuedItem): Promise<'sent' | 'drop' | 'retry'> {
        const path = item.type === 'analysis' ? '/api/analyses' : '/api/pull-requests/merged';
        try {
            const response = await this.request('POST', path, item.payload);
            if (response.ok) { return 'sent'; }
            if (response.status >= 400 && response.status < 500 && !RETRY_STATUSES.has(response.status)) {
                console.warn('CodeAdvisor: la API rechazo un registro del historial y se descarto:', response.status, response.data);
                return 'drop';
            }
            return 'retry';
        } catch {
            return 'retry';
        }
    }

    // ------------------------------------------------------------------ lectura (panel del gerente)

    public getRepos(): Promise<unknown> {
        return this.query('/api/history/repos', {});
    }

    public getSummary(params: { repoId?: number; days?: number }): Promise<unknown> {
        return this.query('/api/history/summary', params);
    }

    public getCycles(params: { repoId?: number; state?: string; search?: string; limit?: number; offset?: number }): Promise<unknown> {
        return this.query('/api/history/cycles', params);
    }

    public getCycleCommits(params: { repoId: number; branch: string; pullRequestId: number | null }): Promise<unknown> {
        return this.query('/api/history/cycles/commits', { repoId: params.repoId, branch: params.branch, pullRequestId: params.pullRequestId ?? undefined });
    }

    public getAnalysisFindings(analysisId: number): Promise<unknown> {
        return this.query(`/api/history/analyses/${encodeURIComponent(String(analysisId))}/findings`, {});
    }

    //GET con los parametros en la direccion, lanza error con el mensaje de la API si no responde bien
    private async query(path: string, params: Record<string, unknown>): Promise<unknown> {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') { search.set(key, String(value)); }
        }
        const queryString = search.toString();

        const response = await this.request('GET', queryString === '' ? path : path + '?' + queryString);
        if (!response.ok) {
            const apiMessage = (response.data as { error?: string } | undefined)?.error;
            throw new Error(apiMessage ?? `La API del historial respondio ${response.status}`);
        }
        return response.data;
    }

    private async request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: unknown }> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const headers: Record<string, string> = { 'content-type': 'application/json' };
            if (this.token !== '') { headers['x-api-token'] = this.token; }

            const response = await this.fetchImpl(this.baseUrl + path, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: controller.signal,
            });

            let data: unknown;
            try { data = await response.json(); } catch { data = undefined; } //una respuesta sin cuerpo no es un error
            return { ok: response.ok, status: response.status, data };
        } finally {
            clearTimeout(timer);
        }
    }
}

let instance: HistoryClient | undefined;

//crea el cliente al activar la extension y manda lo que haya quedado pendiente de la vez anterior
export function initHistory(storage: HistoryStorage, extensionVersion: string, overrides?: { baseUrl?: string; token?: string; fetchImpl?: typeof fetch }): HistoryClient {
    instance = new HistoryClient({
        baseUrl: overrides?.baseUrl ?? HISTORY_API_URL,
        token: overrides?.token ?? HISTORY_API_TOKEN,
        storage,
        extensionVersion,
        fetchImpl: overrides?.fetchImpl,
    });
    void instance.flush();
    return instance;
}

export function getHistory(): HistoryClient | undefined {
    return instance;
}
