// ----------------------------------------------------------------------------------------
// ---- VERIFICACION DE USO DE LINQ: LOOPS MANUALES QUE PUEDEN SIMPLIFICARSE
// ----------------------------------------------------------------------------------------

//"foreach (var item in coleccion)"
//captura el nombre de la variable de iteracion y el nombre de la coleccion 
const FOREACH_PATTERN = /^foreach\s*\(\s*(?:var|[\w<>[\],.]+)\s+([A-Za-z_]\w*)\s+in\s+([A-Za-z_][\w.]*)\s*\)/;

//"for (int i = 0; i < coleccion.Count; i++)"
//reconoce el for clasico indexado y captura el nombre del indice y nombre de la coleccion 
const FOR_INDEXED_PATTERN = /^for\s*\(\s*int\s+([A-Za-z_]\w*)\s*=\s*0\s*;\s*\1\s*<\s*([A-Za-z_][\w.]*)\.Count\s*;\s*\1\+\+\s*\)/;

//"if (condicion)"
const IF_PATTERN = /^if\s*\((.+)\)/;

// "lista.Add(algo);"
const ADD_CALL_PATTERN = /^([A-Za-z_]\w*)\.Add\(\s*(.+?)\s*\)\s*;/;

// "contador++;" o "contador += 1;"
const INCREMENT_PATTERN = /^([A-Za-z_]\w*)\s*(?:\+\+|\+=\s*1\s*;)/;

// "variable += algo;" donde algo no es un simple "1" (acumulacion tipo Sum)
const ACCUMULATE_PATTERN = /^([A-Za-z_]\w*)\s*\+=\s*(.+?)\s*;/;

//"variable = algo; break;" (en dos lineas seguidas)
const ASSING_PATTERN = /^([A-Za-z_]\w*)\s*=\s*(.+?)\s*;/;
const BREAK_PATTERN = /^break\s*;/;

export function analyzeLinqUsage(lines: string[], fileLabel: string, findings: string[]): void {
    if (!fileLabel.endsWith('.cs')) {
        return;
    }

    let depth = 0;
    let insideLoop = false; //para saber si estamos dentro de un for o foreach que estamos analizando
    let loopStartLine = 0; //donde empezo el for o foreach
    let loopVar = ''; // nombre del item (foreach) o del indice (for)
    let sourceCollection = ''; //para saber sobre que coleccion itera 
    //Banderas booleanas que dice que patrones se vieron en algun punto dentro del loop 
    let sawIf = false; 
    let sawAdd = false;
    let sawIncrement = false;
    let sawSum = false;
    let sawAssignThenBreak = false;

    let lastAssignVar: string | null = null; //guarda el nombre de la ultima variable asignada, para poder verificar
                                             // si en la siguiente linea hay un break;

    lines.forEach((rawLine, i) => {
        const line = rawLine.trim();

        // detecta el inicio de un foreach o un for indexado clasico
        const foreachMatch = line.match(FOREACH_PATTERN);
        const forMatch = line.match(FOR_INDEXED_PATTERN);

        //si la linea coincide con FOREACH_PATTERN o FOR_INDEXED_PATTERN y todaia no estabamos en un loop
        if ((foreachMatch || forMatch) && !insideLoop) {
            insideLoop = true;
            loopStartLine = i; //se guarda donde empezo y sobre que variable itera 
            loopVar = foreachMatch ? foreachMatch[1] : forMatch![1];
            sourceCollection = foreachMatch ? foreachMatch[2] : forMatch![2];
            depth = 0;
            sawIf = sawAdd = sawIncrement = sawSum = sawAssignThenBreak = false; // se reinician las banderas a false 
            lastAssignVar = null;
        }

        //si estamos dentro de un loop 
        if (insideLoop) {
            //se prueban los patrones sobre la linea actual 
            //y se van prendiendo las banderas correspondientes 
            if (IF_PATTERN.test(line)) { sawIf = true; }
            if (ADD_CALL_PATTERN.test(line)) { sawAdd = true; }

            // si hay un incremeto tipo contador 
            if (INCREMENT_PATTERN.test(line)) {
                sawIncrement = true;
            } else { //si no es asi pero hay un += generico se cuenta doble como incremento y como suma 
                const accumulateMatch = line.match(ACCUMULATE_PATTERN);
                if (accumulateMatch) { sawSum = true; }
            }

            const assignMatch = line.match(ASSING_PATTERN);
            if (assignMatch) { lastAssignVar = assignMatch[1]; } //se actualiza lastAssignVar
            //s la linea es un break y habia una asignacion previa se prende la bandera
            if (BREAK_PATTERN.test(line) && lastAssignVar) { sawAssignThenBreak = true; } 

            if (line.includes('{')) { depth++; } // cada { suma un depth
            if (line.includes('}')) { // y cada } resta un depth 
                depth--;
                if (depth <= 0) { // cuando vuelva a 0 o menos significa que el loop termino
                    // al cerrar el loop, decide que sugerencia dar evaluando las banderas 
                    if (sawIf && sawAdd) {
                        findings.push(
                            fileLabel + ':' + (loopStartLine + 1) +
                            ' - reemplaza el loop manual por "' + sourceCollection +
                            '.Where(' + loopVar + ' => condicion).Select(' + loopVar +
                            ' => valor).ToList()" para mejorar la legibilidad'
                        );
                    } else if (sawAdd) {
                        findings.push(
                            fileLabel + ':' + (loopStartLine + 1) +
                            ' - reemplaza la transformacion manual por "' + sourceCollection +
                            '.Select(' + loopVar + ' => valor).ToList()" en lugar de usar Add() dentro del loop'
                        );
                    } else if (sawIf && sawIncrement) {
                        findings.push(
                            fileLabel + ':' + (loopStartLine + 1) +
                            ' - reemplaza el conteo manual por "' + sourceCollection +
                            '.Count(' + loopVar + ' => condicion)"'
                        );
                    } else if (sawSum) {
                        findings.push(
                            fileLabel + ':' + (loopStartLine + 1) +
                            ' - reemplaza la acumulacion manual por "' + sourceCollection +
                            '.Sum(' + loopVar + ' => valor)" en lugar de sumar dentro de un loop'
                        );
                    } else if (sawIf && sawAssignThenBreak) {
                        findings.push(
                            fileLabel + ':' + (loopStartLine + 1) +
                            ' - reemplaza la busqueda manual por "' + sourceCollection +
                            '.FirstOrDefault(' + loopVar + ' => condicion)"'
                        );
                    }
                    insideLoop = false; //al terminar reinicia la bandera para poder detecta el siguiente loop 
                }
            }
        }
    });
}
