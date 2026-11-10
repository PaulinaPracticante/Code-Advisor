// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DE TRANSACCIONES EN PROCESOS QUE ESCRIBEN EN LA BASE DE DATOS -------
// ---------------------------------------------------------------------------------------

import { collectChangesFunction } from "../../shared/functionExtraction";
import { Finding, pushFinding } from "../../shared/finding";

//funcion que corta los comentarios, lo que venga despues de //
function stripLineComment(rawLine: string): string {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

interface TransactionLanguagePatterns {
    writeCall: RegExp;
    transactionStart: RegExp;
    commit: RegExp;
    rollback: RegExp;
    rollbackGuard?: RegExp; //construccion que garantiza el rollback aunque no se llame explicitamente (ej. "using" en C#)
    missingRollbackMessage: string;
}

//---- C# (Entity Framework / ADO.NET) ----------------------------------------------------

//llamadas que escriben en la base de datos, cada una es una escritura independiente
//un solo SaveChanges ya es atomico en Entity Framework, por eso solo importa cuando hay 2 o mas
const CSHARP_WRITE_CALL_PATTERN = /\.(?:SaveChanges|ExecuteNonQuery|ExecuteSql(?:Raw|Interpolated)?)(?:Async)?\s*\(/;
const CSHARP_TRANSACTION_START_PATTERN = /\bBeginTransaction(?:Async)?\s*\(|\bnew\s+TransactionScope\s*\(/;
//la transaccion esta dentro de un using, que hace el rollback solo al salir sin confirmar
const CSHARP_TRANSACTION_USING_PATTERN = /\busing\b[^;]*(?:BeginTransaction|new\s+TransactionScope)/;
const CSHARP_COMMIT_PATTERN = /\.(?:Commit|Complete)(?:Async)?\s*\(/;
const CSHARP_ROLLBACK_PATTERN = /\.Rollback(?:Async)?\s*\(/;

const CSHARP_PATTERNS: TransactionLanguagePatterns = {
    writeCall: CSHARP_WRITE_CALL_PATTERN,
    transactionStart: CSHARP_TRANSACTION_START_PATTERN,
    commit: CSHARP_COMMIT_PATTERN,
    rollback: CSHARP_ROLLBACK_PATTERN,
    rollbackGuard: CSHARP_TRANSACTION_USING_PATTERN,
    missingRollbackMessage: 'abre una transaccion sin rollback; usa "using" o llama a Rollback en el catch',
};

//---- PHP (PDO / mysqli) -----------------------------------------------------------------

//llamadas que escriben en la base de datos: PDO (->query/->exec/->execute) y mysqli (mysqli_query, mysqli_stmt_execute)
const PHP_WRITE_CALL_PATTERN = /->(?:query|exec|execute)\s*\(|\bmysqli_query\s*\(|\bmysqli_stmt_execute\s*\(/;
//PDO::beginTransaction() o mysqli::begin_transaction() / mysqli_begin_transaction()
const PHP_TRANSACTION_START_PATTERN = /->beginTransaction\s*\(|->begin_transaction\s*\(|\bmysqli_begin_transaction\s*\(/;
const PHP_COMMIT_PATTERN = /->commit\s*\(|\bmysqli_commit\s*\(/i;
//PDO usa rollBack() y mysqli usa rollback(), por eso va sin distinguir mayusculas
const PHP_ROLLBACK_PATTERN = /->rollback\s*\(|\bmysqli_rollback\s*\(/i;

const PHP_PATTERNS: TransactionLanguagePatterns = {
    writeCall: PHP_WRITE_CALL_PATTERN,
    transactionStart: PHP_TRANSACTION_START_PATTERN,
    commit: PHP_COMMIT_PATTERN,
    rollback: PHP_ROLLBACK_PATTERN,
    //PHP no tiene un equivalente a "using" que garantice el rollback, siempre se exige el rollback explicito
    missingRollbackMessage: 'abre una transaccion sin rollback; llama a rollback() en el catch',
};

function getPatternsForFile(fileLabel: string): TransactionLanguagePatterns | null {
    const extension = fileLabel.split('.').pop();
    if (extension === 'cs') { return CSHARP_PATTERNS; }
    if (extension === 'php') { return PHP_PATTERNS; }
    return null;
}

//funcion principal
//recibe las lineas del archivo, el archivo, los hallazgos y las lineas cambiadas del PR
export function analyzeTransactions(lines: string[], fileLabel: string, findings: Finding[], changedLines: Set<number>): void {
    const patterns = getPatternsForFile(fileLabel);
    if (!patterns) {
        return;
    }

    //por cada metodo que cambio en el PR
    for (const block of collectChangesFunction(lines, changedLines)) {
        const codeLines = block.code.split('\n').map(stripLineComment); //el metodo sin comentarios
        const code = codeLines.join('\n');
        const writes = codeLines.filter(line => patterns.writeCall.test(line)).length; //cuantas escrituras hace el metodo

        //sin transaccion: si hace 2 o mas escrituras y una falla, las otras ya quedaron guardadas
        if (!patterns.transactionStart.test(code)) {
            if (writes >= 2) {
                pushFinding(findings, 'transactions', fileLabel, 'El metodo ' + block.name + ' hace ' + writes + ' escrituras a la base de datos sin una transaccion; usa una transaccion para poder aplicar rollback si una falla', {
                    line: block.startLine,
                    suggestion: 'Envuelve las escrituras en una transaccion para poder hacer rollback si alguna falla.',
                });
            }
            continue;
        }

        //con transaccion: se debe poder confirmar y revertir
        if (!patterns.commit.test(code)) {
            pushFinding(findings, 'transactions', fileLabel, 'El metodo ' + block.name + ' abre una transaccion pero nunca la confirma (Commit/Complete)', {
                line: block.startLine,
                suggestion: 'Confirma la transaccion con Commit/Complete al terminar exitosamente.',
            });
        }

        const hasRollbackGuard = patterns.rollbackGuard?.test(code) ?? false;
        if (!hasRollbackGuard && !patterns.rollback.test(code)) {
            pushFinding(findings, 'transactions', fileLabel, 'El metodo ' + block.name + ' ' + patterns.missingRollbackMessage, {
                line: block.startLine,
                suggestion: 'Agrega un rollback en el catch (o usa "using" si el lenguaje lo soporta).',
            });
        }
    }
}
