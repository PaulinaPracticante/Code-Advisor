const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'; //endpoint de la api de mensaje 
const ANTHROPIC_VERSION = '2023-06-01'; //header requerido por Antropic para fijar la version de la API 

//interfaz de opciones para la llamada 
export interface ClaudeClientOptions {
    model: string; //que modelo usar 
    maxTokens?: number; //limite opcional de tokens por salida 
    system?: string; //contexto fijo , se cachea del lado de Anthropic
}

// funcion que recibe el prompt, las options y devuelve la respuesta como string
export async function callClaude(
    prompt: string,
    options: ClaudeClientOptions
): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY; //le la api key de anthropic
    if (!apiKey) { //si no encuentra la api key devuelve un mensaje de error 
        throw new Error('No hay una API key de Claude configurada (ANTHROPIC_API_KEY en src/.env)');
    }

    const body: Record<string, unknown> = {
        model: options.model,
        max_tokens: options.maxTokens ?? 1024,
        messages: [{role: 'user', content: prompt}],
    }

    if (options.system) {
        body.system = [
            { type: 'text', text: options.system, cache_control: { type: 'ephemeral'} },
        ];
    }

    for (let attempt = 1; ; attempt++) {
        //llamada http
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST', //post al endpoint
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': ANTHROPIC_VERSION,
            },
            body: JSON.stringify(body),
        });

        if (response.ok) {
            //anthropic devulve un campo content (arreglo de bloques), extrae el text de cada uno y los une a todos en un solo string
            const data = await response.json() as  {content: { type: string; text: string }[] };
            return data.content.filter(block => block.type === 'text').map(block => block.text).join('');
        }

        //muchas llamadas al mismo tiempo pueden topar con el limite de peticiones (429) o con la API saturada (529):
        //se espera un poco y se reintenta en vez de perder la revision
        if (attempt < MAX_ATTEMPTS && RETRYABLE_STATUSES.has(response.status)) {
            await response.text().catch(() => ''); //se descarta el cuerpo para liberar la conexion
            await sleep(retryDelayMs(response.headers.get('retry-after'), attempt));
            continue;
        }

        //si hay un error en el mensaje que devolvio la api key, muestra el mensaje de error
        throw new Error(`Claude API respondio ${response.status}: ${await response.text()}`);
    }
}

const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 529]);

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//usa lo que pida la API en retry-after (en segundos, con tope de 15) y si no viene espera 2 s, 4 s...
function retryDelayMs(retryAfterHeader: string | null, attempt: number): number {
    const seconds = Number(retryAfterHeader);
    return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 15) * 1000 : attempt * 2000;
}