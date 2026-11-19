import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const FETCH_TIMEOUT_MS = 30_000;
const DIFF_MAX_BUFFER = 256 * 1024 * 1024; //un diff grande (lockfiles, archivos generados) no debe cortar el analisis

// devuelve el conjunto de numeros de linea (1-indezados) agregados/modificados en "filePath"
// entre "baseRef" y HEAD, leyendo los encabezados de hunk de un diff son contexto.
// baseRef puede ser la rama base completa ("origin/main") o un commit puntual (ver resolveAnalysisBaseRef)
export function getChangedLineNumbers(workspaceRoot: string, baseRef: string, filePath: string): Set<number> {
    const changedLines = new Set<number>();
    let output: string;

    try {
        output = execFileSync(
            'git',
            ['diff', '--unified=0', '--diff-filter=ACMR', `${baseRef}...HEAD`, '--', filePath],
            { cwd: workspaceRoot, encoding: 'utf8' }
        );
    } catch (error) {
        throw new Error(`No se pudo obtener el diff de linea para "${filePath}": ${(error as Error).message}`);
    }

    const hunkHeaderPattern = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
    for (const line of output.split('\n')) {
        const match = line.match(hunkHeaderPattern);
        if (!match) { continue; }
        const newStart = parseInt(match[1], 10);
        const newCount = match[2] !== undefined ? parseInt(match[2], 10): 1;
        for (let lineNumber = newStart; lineNumber < newStart + newCount; lineNumber++) {
            changedLines.add(lineNumber);
        }
    }
    return changedLines;
}

// hash corto y titulo (primera linea del mensaje) de un commit del PR
export interface CommitInfo {
    hash: string;
    subject: string;
}

// devuelve los commits que tiene la rama actual y no tiene la rama base, sin contar los merge
// (dos puntos: son los commits del PR, no el diff de archivos)
export function getCommitSubjects(workspaceRoot: string, baseBranch: string): CommitInfo[] {
    let output: string;

    try {
        output = execFileSync(
            'git',
            ['log', '--no-merges', '--format=%h%x09%s', `origin/${baseBranch}..HEAD`],
            { cwd: workspaceRoot, encoding: 'utf8' }
        );
    } catch (error) {
        throw new Error(`No se pudo obtener los commits contra la rama "origin/${baseBranch}": ${(error as Error).message}`);
    }

    return output
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            const [hash, ...subject] = line.split('\t');
            return { hash, subject: subject.join('\t') };
        });
}

// revisa si alguna linea dentro de [startLine, endLineInclusive] (1-indexado) cambio.
// se usa para hallazgos que se reportan en la linea donde empieza un bloque (metodo, loop, catch)
// aunque lo que realmente cambio este mas abajo en ese bloque.
export function rangeIntersectChangedLines(changedLines: Set<number>, startLine: number, endLineInclusive: number): boolean {
    for (let line = startLine; line <= endLineInclusive; line++) {
        if (changedLines.has(line)) { return true;}
    }
    return false;
}

// descarga la rama base para comparar contra su version mas reciente. Se hace una sola vez por analisis (antes se hacia dos).
// es asincrona para no congelar VS Code mientras espera a la red; sin red, o si tarda mas de 30 segundos,
// se sigue con la copia que ya se tiene de origin/<baseBranch>
export async function fetchBaseBranch(workspaceRoot: string, baseBranch: string): Promise<void> {
    try {
        await execFileAsync('git', ['fetch', 'origin', baseBranch], { cwd: workspaceRoot, timeout: FETCH_TIMEOUT_MS });
    } catch {
        // sin red se usa la copia local de origin/<baseBranch>
    }
}

// la rama base ya debe estar descargada (ver fetchBaseBranch)
export function resolveAnalysisBaseRef(workspaceRoot: string, baseBranch: string, lastAnalyzedCommit?: string): string {
    const baseBranchRef = `origin/${baseBranch}`;
    if (!lastAnalyzedCommit) { return baseBranchRef; }

    try {
        execFileSync('git', ['merge-base', '--is-ancestor', lastAnalyzedCommit, 'HEAD'], { cwd: workspaceRoot, encoding: 'utf8' });
        return lastAnalyzedCommit;
    } catch {
        return baseBranchRef;
    }
}

// true si "commit" ya esta dentro de origin/<baseBranch>, es decir, el PR de esa rama ya se mergeo.
// solo detecta los merge normales ("Merge pull request"): con squash los commits de la rama no quedan dentro de la base
// fetchFirst en false evita volver a descargar la rama base cuando ya se acaba de hacer en la misma revision
export function isCommitInBase(workspaceRoot: string, baseBranch: string, commit: string, fetchFirst = true): boolean {
    if (fetchFirst) {
        try {
            execFileSync('git', ['fetch', 'origin', baseBranch], { cwd: workspaceRoot, encoding: 'utf8' });
        } catch {
            // sin red se usa la copia que ya se tiene de origin/<baseBranch>
        }
    }

    try {
        execFileSync('git', ['merge-base', '--is-ancestor', commit, `origin/${baseBranch}`], { cwd: workspaceRoot, encoding: 'utf8' });
        return true;
    } catch {
        return false;
    }
}

// lineas que cambiaron desde "baseRef" y ademas son parte del PR (los cambios de la rama contra la rama base).
// en un analisis incremental baseRef es el ultimo commit analizado: si la rama se actualizo con la base, el diff desde ese
// commit trae tambien cambios de otras personas, que no son del PR y no se deben revisar
const HUNK_HEADER_PATTERN = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

// lee un diff de varios archivos y regresa, por ruta, los numeros de linea agregados/modificados.
// una ruta que no se pueda leer (nombre entre comillas, archivo sin lineas) no aparece en el resultado:
// quien lo usa pide el diff de ese archivo por separado con getChangedLineNumbers
function parseChangedLinesByFile(diffOutput: string): Map<string, Set<number>> {
    const byFile = new Map<string, Set<number>>();
    let current: Set<number> | undefined;
    let inFileHeader = false; //solo en el encabezado de un archivo "+++ " es el nombre, dentro de un hunk es una linea agregada

    for (const line of diffOutput.split('\n')) {
        if (line.startsWith('diff --git ')) {
            inFileHeader = true;
            current = undefined;
            continue;
        }
        if (inFileHeader && line.startsWith('+++ ')) {
            const target = line.slice(4).replace(/\t.*$/, '').replace(/\r$/, ''); //con espacios en el nombre git agrega un tabulador
            if (target.startsWith('b/')) {
                current = new Set<number>();
                byFile.set(target.slice(2), current);
            }
            continue;
        }
        if (!line.startsWith('@@')) { continue; }
        inFileHeader = false;
        if (!current) { continue; }

        const match = line.match(HUNK_HEADER_PATTERN);
        if (!match) { continue; }
        const newStart = parseInt(match[1], 10);
        const newCount = match[2] !== undefined ? parseInt(match[2], 10) : 1;
        for (let lineNumber = newStart; lineNumber < newStart + newCount; lineNumber++) {
            current.add(lineNumber);
        }
    }
    return byFile;
}

// lo mismo que getChangedLineNumbers pero de todos los archivos a la vez con un solo "git diff": cada proceso de git
// cuesta decenas de milisegundos en Windows y antes se lanzaba uno (o dos) por archivo.
// --no-renames: un archivo renombrado sale como archivo nuevo con todas sus lineas, igual que al pedir el diff de una sola ruta
export function getChangedLineNumbersByFile(workspaceRoot: string, baseRef: string): Map<string, Set<number>> {
    const output = execFileSync(
        'git',
        ['-c', 'core.quotePath=false', 'diff', '--no-color', '--unified=0', '--no-renames', '--diff-filter=ACMR', `${baseRef}...HEAD`],
        { cwd: workspaceRoot, encoding: 'utf8', maxBuffer: DIFF_MAX_BUFFER }
    );
    return parseChangedLinesByFile(output);
}

// versión de getPrChangedLineNumbers para todos los archivos a la vez (ver getChangedLineNumbersByFile)
export function getPrChangedLineNumbersByFile(workspaceRoot: string, baseRef: string, baseBranchRef: string): Map<string, Set<number>> {
    const sinceBaseRef = getChangedLineNumbersByFile(workspaceRoot, baseRef);
    if (baseRef === baseBranchRef) { return sinceBaseRef; }

    const inPr = getChangedLineNumbersByFile(workspaceRoot, baseBranchRef);
    const result = new Map<string, Set<number>>();
    for (const [file, lines] of sinceBaseRef) {
        const prLines = inPr.get(file); //un archivo que no es del PR no deja ninguna linea
        result.set(file, new Set([...lines].filter(line => prLines?.has(line) ?? false)));
    }
    return result;
}

export function getPrChangedLineNumbers(workspaceRoot: string, baseRef: string, baseBranchRef: string, filePath: string): Set<number> {
    const sinceBaseRef = getChangedLineNumbers(workspaceRoot, baseRef, filePath);
    if (baseRef === baseBranchRef) { return sinceBaseRef; }

    const inPr = getChangedLineNumbers(workspaceRoot, baseBranchRef, filePath);
    return new Set([...sinceBaseRef].filter(line => inPr.has(line)));
}