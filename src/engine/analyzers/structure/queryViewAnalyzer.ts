// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DE QUERYS GRANDES QUE DEBERIAN IR EN UNA VISTA ----------------------
// ---------------------------------------------------------------------------------------

import { rangeIntersectChangedLines } from "../../shared/diffUtils";
import { extractSqlStatements } from "../../shared/sqlExtraction";
import { QueryViewsConfig } from "../../config/configLoader";
import { Finding, pushFinding } from "../../shared/finding";

//tabla que viene despues de FROM o JOIN, puede traer la base de datos: base.tabla o base.esquema.tabla
const TABLE_REFERENCE_PATTERN = /\b(?:FROM|JOIN)\s+([\w.\[\]`"]+)/gi;
const JOIN_PATTERN = /\bJOIN\b/gi;
//parametros de la query: @nombre, :nombre o ? (el texto concatenado ya viene como __EXPR__, no cuenta como parametro)
const PARAMETER_PATTERN = /[@:][A-Za-z_]\w*|\?/g;
//solo las consultas que leen datos se pueden pasar a una vista
const SELECT_PATTERN = /^(?:SELECT|WITH)\b/i;
//esquemas que no son una base de datos, dbo.Tabla es una sola base de datos
const SCHEMA_NAMES = new Set(['dbo', 'public', 'sys', 'information_schema']);

//cuenta las columnas de la lista del SELECT principal (las comas que no estan dentro de parentesis)
function countSelectColumns(sql: string): number {
    const selectMatch = sql.match(/^(?:WITH\b.*?\)\s*)?SELECT\s+(?:DISTINCT\s+|TOP\s+\d+\s+)?/i);
    if (!selectMatch) { return 0; }

    const rest = sql.slice(selectMatch[0].length);
    let depth = 0;
    let count = 1;
    for (let i = 0; i < rest.length; i++) {
        const char = rest[i];
        if (char === '(') {
            depth++;
        } else if (char === ')') {
            depth--;
        } else if (depth === 0) {
            if (char === ',') { count++; }
            if (rest.slice(i, i + 6).toUpperCase() === ' FROM ') { break; } //aqui termina la lista de columnas
        }
    }
    return count;
}

//cuenta los parametros distintos de la query: los nombrados (@id) una vez cada uno y cada ? por separado
function countParameters(sql: string): number {
    const found = sql.match(PARAMETER_PATTERN) ?? [];
    const named = new Set(found.filter(parameter => parameter !== '?').map(parameter => parameter.toLowerCase()));
    return named.size + found.filter(parameter => parameter === '?').length;
}

//regresa las bases de datos distintas que usan las tablas de la query (base.tabla o base.esquema.tabla)
function findDatabases(sql: string): string[] {
    const databases = new Set<string>();
    TABLE_REFERENCE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = TABLE_REFERENCE_PATTERN.exec(sql)) !== null) {
        const parts = match[1].replace(/[\[\]`"]/g, '').split('.');
        if (parts.length < 2) { continue; }
        const database = parts[0].toLowerCase();
        if (!SCHEMA_NAMES.has(database)) { databases.add(database); }
    }
    return [...databases];
}

//funcion principal
//recibe las lineas del archivo, el archivo, los hallazgos y las lineas cambiadas del PR
export function analyzeQueryViews(lines: string[], fileLabel: string, findings: Finding[], changedLines: Set<number>, config: QueryViewsConfig): void {
    //por cada query SQL que esta escrita en el codigo
    for (const statement of extractSqlStatements(lines)) {
        if (!SELECT_PATTERN.test(statement.text)) { continue; } //solo las consultas SELECT pueden ir en una vista
        if (!rangeIntersectChangedLines(changedLines, statement.startLine, statement.endLine)) { continue; } //solo las queries que cambiaron en el PR

        const reasons: string[] = [];

        //consulta tablas de mas de una base de datos
        const databases = findDatabases(statement.text);
        if (databases.length > 1) {
            reasons.push('usa tablas de ' + databases.length + ' bases de datos distintas (' + databases.join(', ') + ')');
        }

        //es muy grande por joins, columnas o parametros
        const joins = (statement.text.match(JOIN_PATTERN) ?? []).length;
        if (joins > config.maxJoins) { reasons.push('tiene ' + joins + ' JOIN (maximo ' + config.maxJoins + ')'); }

        const columns = countSelectColumns(statement.text);
        if (columns > config.maxColumns) { reasons.push('trae ' + columns + ' columnas (maximo ' + config.maxColumns + ')'); }

        const parameters = countParameters(statement.text);
        if (parameters > config.maxParameters) { reasons.push('usa ' + parameters + ' parametros (maximo ' + config.maxParameters + ')'); }

        if (reasons.length > 0) {
            pushFinding(findings, 'queryViews', fileLabel, 'La consulta ' + reasons.join(' y ') + '; trasladala a una vista', {
                line: statement.startLine,
                suggestion: 'Traslada esta consulta a una vista de base de datos.',
            });
        }
    }
}
