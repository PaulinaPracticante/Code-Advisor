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

    //si hay un error en el mensaje que devolvio la api key, muestra el mensaje de error 
    if (!response.ok) {
        throw new Error(`Claude API respondio ${response.status}: ${await response.text()}`);
    }

    //anthropic devulve un campo content (arreglo de bloques), extrae el text de cada uno y los une a todos en un solo string 
    const data = await response.json() as  {content: { type: string; text: string }[] };
    return data.content.filter(block => block.type === 'text').map(block => block.text).join('');
}