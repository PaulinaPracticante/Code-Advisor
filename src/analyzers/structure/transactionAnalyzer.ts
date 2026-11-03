// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DE TRANSACCIONES EN PROCESOS QUE ESCRIBEN EN LA BASE DE DATOS -------
// ---------------------------------------------------------------------------------------

import { collectChangesFunction } from "../../shared/functionExtraction";

//funcion que corta los comentarios, lo que venga despues de //
function stripLineComment(rawLine: string): string {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

//llamadas que escriben en la base de datos, cada una es una escritura independiente
//un solo SaveChanges ya es atomico en Entity Framework, por eso solo importa cuando hay 2 o mas
const WRITE_CALL_PATTERN = /\.(?:SaveChanges|ExecuteNonQuery|ExecuteSql(?:Raw|Interpolated)?)(?:Async)?\s*\(/;
//formas de abrir una transaccion
const TRANSACTION_START_PATTERN = /\bBeginTransaction(?:Async)?\s*\(|\bnew\s+TransactionScope\s*\(/;
//la transaccion esta dentro de un using, que hace el rollback solo al salir sin confirmar
const TRANSACTION_USING_PATTERN = /\busing\b[^;]*(?:BeginTransaction|new\s+TransactionScope)/;
//confirmar la transaccion: Commit en DbTransaction o Complete en TransactionScope
const COMMIT_PATTERN = /\.(?:Commit|Complete)(?:Async)?\s*\(/;
const ROLLBACK_PATTERN = /\.Rollback(?:Async)?\s*\(/;

//funcion principal
//recibe las lineas del archivo, el archivo, los hallazgos y las lineas cambiadas del PR
export function analyzeTransactions(lines: string[], fileLabel: string, findings: string[], changedLines: Set<number>): void {
    //las transacciones de Entity Framework y ADO.NET son de c#
    if (!fileLabel.endsWith('.cs')) {
        return;
    }

    //por cada metodo que cambio en el PR
    for (const block of collectChangesFunction(lines, changedLines)) {
        const codeLines = block.code.split('\n').map(stripLineComment); //el metodo sin comentarios
        const code = codeLines.join('\n');
        const writes = codeLines.filter(line => WRITE_CALL_PATTERN.test(line)).length; //cuantas escrituras hace el metodo
        const where = fileLabel + ':' + block.startLine;

        //sin transaccion: si hace 2 o mas escrituras y una falla, las otras ya quedaron guardadas
        if (!TRANSACTION_START_PATTERN.test(code)) {
            if (writes >= 2) {
                findings.push(where + ' - El metodo ' + block.name + ' hace ' + writes + ' escrituras a la base de datos sin una transaccion; usa una transaccion para poder aplicar rollback si una falla');
            }
            continue;
        }

        //con transaccion: se debe poder confirmar y revertir
        if (!COMMIT_PATTERN.test(code)) {
            findings.push(where + ' - El metodo ' + block.name + ' abre una transaccion pero nunca la confirma (Commit/Complete)');
        }
        if (!TRANSACTION_USING_PATTERN.test(code) && !ROLLBACK_PATTERN.test(code)) {
            findings.push(where + ' - El metodo ' + block.name + ' abre una transaccion sin rollback; usa "using" o llama a Rollback en el catch');
        }
    }
}
