// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DE ALIAS DE TABLAS: ABREVIATURA O NOMBRE COMPLETO -------------------
// ---------------------------------------------------------------------------------------

import { rangeIntersectChangedLines } from "../../shared/diffUtils";
import { extractSqlStatements } from "../../shared/sqlExtraction";

//tabla que viene despues de FROM, JOIN o UPDATE (el UPDATE de FOR UPDATE y ON DUPLICATE KEY UPDATE no es una tabla)
const TABLE_PATTERN = /\b(?:FROM|JOIN|(?<!(?:FOR|KEY)\s+)UPDATE)\s+([\w.\[\]`"]+)/gi;

//palabras de SQL que pueden venir despues de una tabla y no son su alias
const SQL_KEYWORDS = new Set([
    'WHERE', 'ON', 'USING', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'NATURAL', 'JOIN', 'GROUP', 'ORDER',
    'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'INTERSECT', 'EXCEPT', 'SET', 'VALUES', 'SELECT', 'WITH', 'FOR', 'FETCH',
    'AS', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'NOT', 'NULL', 'LATERAL', 'OUTPUT', 'RETURNING', 'WINDOW',
]);

//una tabla de la query con su alias, si no tiene alias queda en null
interface TableReference {
    table: string;
    alias: string | null;
}

//separa el nombre de una tabla en palabras: order_items -> [order, items], OrderItems -> [order, items]
function splitWords(name: string): string[] {
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .split('_')
        .filter(word => word.length > 0)
        .map(word => word.toLowerCase());
}

//revisa si las letras del alias aparecen en orden dentro del nombre de la tabla (ej. cust en customers)
function isSubsequence(alias: string, table: string): boolean {
    let position = 0;
    for (const char of table) {
        if (char === alias[position]) { position++; }
        if (position === alias.length) { return true; }
    }
    return false;
}

//el alias es valido si es el nombre completo o una abreviatura: las iniciales de las palabras de la tabla
//(order_items -> oi) o letras del nombre en orden empezando con la misma letra (customers -> cust, c)
function isValidAlias(alias: string, table: string): boolean {
    const lowerAlias = alias.toLowerCase();
    const words = splitWords(table);
    const lowerTable = words.join('');

    if (lowerAlias === lowerTable) { return true; }
    if (words.length > 1 && words.map(word => word[0]).join('') === lowerAlias) { return true; }
    return lowerAlias[0] === lowerTable[0] && isSubsequence(lowerAlias, lowerTable);
}

//sugerencia de alias para el mensaje: las iniciales si la tabla tiene varias palabras, o sus primeras 3 letras
function suggestAlias(table: string): string {
    const words = splitWords(table);
    return words.length > 1 ? words.map(word => word[0]).join('') : words.join('').slice(0, 3);
}

//saca cada tabla de la query con su alias (con o sin AS)
function collectTableReferences(sql: string): TableReference[] {
    const references: TableReference[] = [];
    TABLE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = TABLE_PATTERN.exec(sql)) !== null) {
        const rest = sql.slice(TABLE_PATTERN.lastIndex); //lo que sigue despues del nombre de la tabla
        if (/^\s*\(/.test(rest)) { continue; } //es una funcion que regresa una tabla, no una tabla

        const table = match[1].replace(/[\[\]`"]/g, '').split('.').pop() ?? match[1];
        if (table.startsWith('__EXPR__')) { continue; } //el nombre de la tabla viene de una variable

        const aliasMatch = rest.match(/^\s+(?:AS\s+)?([A-Za-z_]\w*)/i);
        const alias = aliasMatch && !SQL_KEYWORDS.has(aliasMatch[1].toUpperCase()) && !aliasMatch[1].startsWith('__EXPR__')
            ? aliasMatch[1]
            : null;
        references.push({ table, alias });
    }
    return references;
}

//funcion principal
//recibe las lineas del archivo, el archivo, los hallazgos y las lineas cambiadas del PR
export function analyzeTableAliases(lines: string[], fileLabel: string, findings: string[], changedLines: Set<number>): void {
    //por cada query SQL que esta escrita en el codigo
    for (const statement of extractSqlStatements(lines)) {
        if (!rangeIntersectChangedLines(changedLines, statement.startLine, statement.endLine)) { continue; } //solo las queries que cambiaron en el PR

        const references = collectTableReferences(statement.text);
        const hasSeveralTables = references.length > 1; //con una sola tabla no hay confusion de columnas, el alias es opcional
        const where = fileLabel + ':' + statement.startLine;

        for (const reference of references) {
            if (!reference.alias) {
                if (hasSeveralTables) {
                    findings.push(where + ' - La tabla ' + reference.table + ' no tiene alias; en una consulta con varias tablas usa su nombre completo o una abreviatura, ej. "' + suggestAlias(reference.table) + '"');
                }
                continue;
            }

            if (!isValidAlias(reference.alias, reference.table)) {
                findings.push(where + ' - El alias "' + reference.alias + '" de la tabla ' + reference.table + ' no es su nombre completo ni una abreviatura, ej. "' + suggestAlias(reference.table) + '"');
            }
        }
    }
}
