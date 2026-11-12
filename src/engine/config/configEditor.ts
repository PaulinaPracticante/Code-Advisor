// ----------------------------------------------------------------------------------------------------
// ---- VALIDA LO QUE EL GERENTE CAPTURA EN EL PANEL Y LO CONVIERTE EN EL CONTENIDO A FIRMAR ---------
// ----------------------------------------------------------------------------------------------------

import { DEFAULT_CONFIG, Priority, RULE_PRIORITIES } from './configLoader';
import { canonicalize } from './configSignature';

const PRIORITIES: Priority[] = ['Alta', 'Media', 'Baja'];

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
