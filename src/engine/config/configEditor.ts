// ----------------------------------------------------------------------------------------------------
// ---- VALIDA LO QUE EL GERENTE CAPTURA EN EL PANEL Y LO CONVIERTE EN EL CONTENIDO A FIRMAR ---------
// ----------------------------------------------------------------------------------------------------

import { DEFAULT_CONFIG, Priority, RULE_PRIORITIES } from './configLoader';

const PRIORITIES: Priority[] = ['Alta', 'Media', 'Baja'];

//copia el valor con las las llaves de los objetos para comparar los valores
function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) { return value.map(sortKeys); }
    if (value !== null && typeof value === 'object') {
        const source = value as Record<string, unknown>;
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(source).sort()) { sorted[key] = sortKeys(source[key]); }
        return sorted;
    }
    return value;
}

function canonicalize(value: unknown): string {
    return JSON.stringify(sortKeys(value));
}

//el contenido listo para firmar, o el mensaje de por que no se puede guardar
export type PrepareResult = { content: Record<string, unknown> } | { error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function has(object: object, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(object, key);
}

//nombre del tipo de un valor, distingue los arreglos y null de los objetos
function typeName(value: unknown): string {
    if (Array.isArray(value)) { return 'arreglo'; }
    return value === null ? 'null' : typeof value;
}

//deja solo lo que cambio respecto a la base, regresa undefined si no hay ninguna diferencia
function diffValue(base: unknown, next: unknown): unknown {
    if (base === undefined) { return next; }
    if (isPlainObject(base) && isPlainObject(next)) {
        const changes: Record<string, unknown> = {};
        for (const key of Object.keys(next)) {
            const change = diffValue(base[key], next[key]);
            if (change !== undefined) { changes[key] = change; }
        }
        return Object.keys(changes).length > 0 ? changes : undefined;
    }
    return canonicalize(base) === canonicalize(next) ? undefined : next;
}

function isTextList(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
}

//un patron que no compila haria fallar todo el analisis, por eso se revisa antes de guardarlo
function regexProblem(pattern: string): string | undefined {
    try {
        new RegExp(pattern);
        return undefined;
    } catch (error) {
        return (error as Error).message;
    }
}

//revisa los parametros que tienen una estructura propia (capas, repositorios) o que son expresiones regulares;
//regresa el mensaje del primer problema, undefined si todo esta bien
function validateRuleDetails(rules: Record<string, unknown>): string | undefined {
    const layers = (rules.layers as Record<string, unknown> | undefined)?.layers;
    if (layers !== undefined) {
        if (!Array.isArray(layers)) { return 'Las capas del proyecto deben ser una lista.'; }
        for (const [index, layer] of layers.entries()) {
            const label = 'La capa ' + (index + 1);
            if (!isPlainObject(layer)) { return label + ' no tiene el formato esperado.'; }
            if (typeof layer.name !== 'string' || layer.name.trim() === '') { return label + ' necesita un nombre.'; }
            if (!isTextList(layer.folders) || layer.folders.filter(folder => folder.trim() !== '').length === 0) {
                return 'La capa "' + layer.name + '" necesita al menos un nombre de carpeta.';
            }
            if (typeof layer.required !== 'boolean') { return 'La capa "' + layer.name + '" debe indicar si es obligatoria.'; }
            if (layer.requiredIfDatabaseDetected !== undefined && typeof layer.requiredIfDatabaseDetected !== 'boolean') {
                return 'La capa "' + layer.name + '" tiene un valor no válido en "solo si usa base de datos".';
            }
        }
    }

    const databasePatterns = (rules.layers as Record<string, unknown> | undefined)?.databaseUsagePatterns;
    if (databasePatterns !== undefined) {
        if (!isTextList(databasePatterns)) { return 'Los patrones de base de datos deben ser texto.'; }
        for (const pattern of databasePatterns) {
            const problem = regexProblem(pattern);
            if (problem) { return 'El patrón de base de datos "' + pattern + '" no es válido: ' + problem; }
        }
    }

    const repos = (rules.folderNaming as Record<string, unknown> | undefined)?.repos;
    if (repos !== undefined) {
        if (!Array.isArray(repos)) { return 'Los repositorios con estructura definida deben ser una lista.'; }
        const seen = new Set<string>();
        for (const [index, repo] of repos.entries()) {
            const label = 'El repositorio ' + (index + 1);
            if (!isPlainObject(repo)) { return label + ' no tiene el formato esperado.'; }
            if (typeof repo.name !== 'string' || repo.name.trim() === '') { return label + ' necesita un nombre.'; }
            const key = repo.name.trim().toLowerCase();
            if (seen.has(key)) { return 'El repositorio "' + repo.name + '" está repetido.'; }
            seen.add(key);
            if (repo.naming !== 'none' && repo.naming !== 'PascalCase' && repo.naming !== 'kebab-case') {
                return 'La convención de nombres de "' + repo.name + '" debe ser PascalCase, kebab-case o sin revisar.';
            }
            if (!isTextList(repo.requiredFolders)) { return 'Las carpetas obligatorias de "' + repo.name + '" deben ser texto.'; }
        }
    }

    const commitPattern = (rules.commitMessage as Record<string, unknown> | undefined)?.pattern;
    if (commitPattern !== undefined) {
        if (typeof commitPattern !== 'string' || commitPattern.trim() === '') { return 'El formato del título del commit no puede estar vacío.'; }
        const problem = regexProblem(commitPattern);
        if (problem) { return 'El formato del título del commit no es una expresión regular válida: ' + problem; }
    }

    const objectUsage = rules.objectUsage as Record<string, unknown> | undefined;
    if (objectUsage !== undefined) {
        for (const language of ['csharp', 'typescript', 'javascript']) {
            const exempt = (objectUsage[language] as Record<string, unknown> | undefined)?.exemptPatterns;
            if (exempt === undefined) { continue; }
            if (!isTextList(exempt)) { return 'Las líneas permitidas de object (' + language + ') deben ser texto.'; }
            for (const pattern of exempt) {
                const problem = regexProblem(pattern);
                if (problem) { return 'El patrón "' + pattern + '" de object (' + language + ') no es válido: ' + problem; }
            }
        }
    }

    return undefined;
}

//recibe lo que mando el panel (reglas, prioridades y rutas excluidas), lo valida contra los valores por defecto
//y regresa solo lo que el gerente cambio, que es lo que se firma y se guarda en code-advisor.config.json
export function prepareConfigContent(submitted: unknown): PrepareResult {
    if (!isPlainObject(submitted) || !isPlainObject(submitted.rules) || !isPlainObject(submitted.priorities) || !Array.isArray(submitted.exclude)) {
        return { error: 'La configuración enviada no tiene el formato esperado.' };
    }
    if (!submitted.exclude.every(item => typeof item === 'string')) {
        return { error: 'Las rutas excluidas deben ser texto.' };
    }
    const exclude = (submitted.exclude as string[]).map(item => item.trim()).filter(item => item !== '');

    //cada regla debe existir y cada valor debe ser del mismo tipo que el de por defecto (un numero sigue siendo numero)
    const defaultRules = DEFAULT_CONFIG.rules as unknown as Record<string, Record<string, unknown>>;
    for (const [ruleName, rule] of Object.entries(submitted.rules)) {
        if (!has(defaultRules, ruleName)) { return { error: 'La regla "' + ruleName + '" no existe.' }; }
        if (!isPlainObject(rule)) { return { error: 'La regla "' + ruleName + '" debe ser un objeto.' }; }
        for (const [prop, value] of Object.entries(rule)) {
            const defaultValue = defaultRules[ruleName][prop];
            if (defaultValue !== undefined && typeName(defaultValue) !== typeName(value)) {
                return { error: 'El valor de "' + ruleName + '.' + prop + '" debe ser de tipo ' + typeName(defaultValue) + '.' };
            }
        }
    }

    const detailsProblem = validateRuleDetails(submitted.rules);
    if (detailsProblem) { return { error: detailsProblem }; }

    //las prioridades solo pueden ser Alta, Media o Baja y de reglas que reportan hallazgos
    for (const [ruleName, priority] of Object.entries(submitted.priorities)) {
        if (!has(RULE_PRIORITIES, ruleName)) { return { error: 'La regla "' + ruleName + '" no tiene prioridad configurable.' }; }
        if (!PRIORITIES.includes(priority as Priority)) { return { error: 'La prioridad de "' + ruleName + '" debe ser Alta, Media o Baja.' }; }
    }

    //solo se guarda lo que cambio, asi cuando salgan valores por defecto nuevos en una version de la extension se aplican solos
    const content: Record<string, unknown> = {};
    const rules = diffValue(DEFAULT_CONFIG.rules, submitted.rules);
    if (rules !== undefined) { content.rules = rules; }

    const priorities: Record<string, unknown> = {};
    for (const [ruleName, priority] of Object.entries(submitted.priorities)) {
        if (priority !== RULE_PRIORITIES[ruleName]) { priorities[ruleName] = priority; }
    }
    if (Object.keys(priorities).length > 0) { content.priorities = priorities; }

    if (canonicalize(exclude) !== canonicalize(DEFAULT_CONFIG.exclude)) { content.exclude = exclude; }

    return { content };
}
