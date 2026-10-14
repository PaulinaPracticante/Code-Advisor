import { execFileSync } from 'child_process';

// devuelve el conjunto de numeros de linea (1-indezados) agregados/modificados en "filePath"
// entre la rama base y HEAD, leyendo los encabezados de hunk de un diff son contexto
export function getChangedLineNumbers(workspaceRoot: string, baseBranch: string, filePath: string): Set<number> {
    const changedLines = new Set<number>();
    let output: string;

    try {
        output = execFileSync(
            'git',
            ['diff', '--unified=0', '--diff-filter=ACMR', `origin/${baseBranch}...HEAD`, '--', filePath],
            { cwd: workspaceRoot, encoding: 'utf8' }
        );
    } catch (error) {
        throw new Error(`No se pudo obtener el diff de linea para "${filePath}": ${(error as Error).message}`);
    }

    const hunkHeaderPattern = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))?@@/;
    for (const line of output.split('\n')) {
        const match = line.match(hunkHeaderPattern);
        if (!match) { continue; }
        const newStart = parseInt(match[1], 10);
        const newCount = match[2] !== undefined ? parseInt(match[2], 10): 1;
        for (let lineNumber = newStart; lineNumber < newStart + newCount; lineNumber) {
            changedLines.add(lineNumber);
        }
    }
    return changedLines;
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