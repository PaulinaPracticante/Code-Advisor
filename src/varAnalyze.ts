// -----------------------------------------------------------------------------------------
// ---- VERIFICACION DE USO DE "var" -------------------------------------------------------
// -----------------------------------------------------------------------------------------

// Matchea lineas tipo var id = 1023;
const VAR_DECL_PATTERN = /^var\s+([A-Za-z_]\w*)\s*=\s*(.+?)\s*;\s*$/;

// "Tipo nombre = expresion;" (declaracion con tipo explicito, sin modificadores: solo aplica a variables locales)
const EXPLICIT_DECL_PATTERN = /^([A-Za-z_][\w<>[\],.?]*)\s+([A-Za-z_]\w*)\s*=\s*(.+?)\s*;\s*$/;

// tipo evidente por el lado derecho:
const NEW_OBJECT_PATTERN = /^new\s+([A-Za-z_][\w<>[\],.]*)\s*[\(\{]/;    // new Foo(...) / new Foo { ... }, captura "Foo"
const EXPLICIT_CAST_PATTERN = /^\(\s*[A-Za-z_][\w<>[\],.]*\s*\)\s*\S/;   // (Foo)algo
const LITERAL_PATTERN = /^(-?\d+(\.\d+)?[mMfFdDlLuU]?|true|false|null|'.'|".*")$/; // numero, bool, null, char o string literal

// llamada a un metodo que termina en "...Async(", con o sin "await" antes (el resultado es un Task/Task<T>)
const ASYNC_CALL_PATTERN = /\b[A-Za-z_]\w*Async\s*\(/;

// deteccion de metodo 
const METHOD_PATTERN = /^(?:public|private|protected|internal|static)(?:\s+(?:public|private|protected|internal|static|virtual|override|sealed))*\s+(async\s+)?([\w<>[\],.?\s]+?)\s+([A-Za-z_]\w*)\s*\(/;
const RETURN_NEW_PATTERN = /^return\s+new\s+([A-Za-z_]\w*)\s*[\(\{]/;

//funcion principal para el analisis 
export function analyzeVarUsage(lines: string[], fileLabel: string, findings: string[]): void {
    //ignora el archivo si no es de c#
    if (!fileLabel.endsWith('cs')) {
        return;
    }

    //variables que llevan contexto de metodo que se esta analizando 
    let insideMethod = false;
    let isAsyncMethod = false;
    let methodStartLine = 0;
    let depth = 0;
    let bodyStarted = false;
    const returnedTypes = new Set<string>(); // tipos distintos vistos en "return new Tipo(...)"

    lines.forEach((rawLine, i) => {
        const line = rawLine.trim();
        // se quita un comentario "// ..." al final, si lo hay, para que no rompa los patrones
        // de declaracion que exigen que la linea termine justo despues del ";"
        const codeLine = line.replace(/\/\/.*$/, '').trim();
        const where = fileLabel + ':' + (i + 1);

        // seguimiento de metodo actual
        const methodMatch = line.match(METHOD_PATTERN);
        //cuando una linea matchea con el METHOD_PATTERN y no esta dentro de un metodo 
        if (methodMatch && !insideMethod) {
            insideMethod = true; //se marca como true
            isAsyncMethod = !!methodMatch[1];
            methodStartLine = i; //se registra el linea donde inicia del metodo 
            depth = 0; 
            bodyStarted = false;
            returnedTypes.clear(); //se limpia el returnedTypes 
        }

        //cuando se esta adentro del metodo 
        if (insideMethod) {
            // se recolecta tipos concretos usados en "return new Tipo(...)"
            const returnMatch = line.match(RETURN_NEW_PATTERN);
            if (returnMatch) {
                returnedTypes.add(returnMatch[1]);
            }

            //cuenta las llaves { y }
            const opens = (line.match(/{/g) || []).length;
            const closes = (line.match(/}/g) || []).length;
            if (opens > 0) { bodyStarted = true; } 
            depth += opens - closes;

            //si el depth esta en 0
            if (bodyStarted && depth <= 0) {
                //si el tamaño del returnedTypes es mayor de 1, hay hallazgo
                if (isAsyncMethod && returnedTypes.size > 1) {
                    findings.push(
                        fileLabel + ':' + (methodStartLine + 1) +
                        ' - este metodo async retorna distintos tipos concretos (' +
                        Array.from(returnedTypes).join(', ') +
                        '); evita "var" al capturar su resultado y usa el tipo de retorno explicito'
                    );
                }
                insideMethod = false; //se reincia para detectar el siguiente metodo
            }
        }

        // caso A: se declaro con "var"
        //busca el match con VAR_DECL_PATTERN 
        const varMatch = codeLine.match(VAR_DECL_PATTERN);
        //se capturan el nombre de la variable con VarName y todo lo que esta a la derecha con rhs 
        if (varMatch) {
            const [, varName, rhs] = varMatch;

            //si la linea es un var evalua el rhs, si el valor es un literal simple, hay hallazgo 
            if (LITERAL_PATTERN.test(rhs)) {
                findings.push(
                    where + ' - "var ' + varName +
                    '" se asigna un literal simple; declara el tipo primitivo explicito en vez de "var"'
                );
            //si no es literal revisa si el rhs revisa si matchea con NEW_OBJECT_PATTERN, EXPLICIT_CAST_PATTEN o ASYNC_CALL_PATTERN 
            //si ni uno de los 3 aplica, hay hallazgo por que nadie puede saber el tipo real con solo leer la linea 
            } else if (!NEW_OBJECT_PATTERN.test(rhs) && !EXPLICIT_CAST_PATTERN.test(rhs) && !ASYNC_CALL_PATTERN.test(rhs)) {
                findings.push(
                    where + ' - "var ' + varName +
                    '" no deja ver el tipo con solo leer la linea; usa el tipo explicito en vez de "var"'
                );
            }
            return; //si matcheo alguno de los 3 ese uso de var esta bien 
        }

        // caso B: se declaro con un tipo explicito (variable local, sin modificadores de acceso)
        //busca el match con EXPLICIT_DECL_PATTERN
        const explicitMatch = codeLine.match(EXPLICIT_DECL_PATTERN);
        //se captura cualquier palabra como tipo 
        if (explicitMatch) {
            const [, declaredType, varName, rhs] = explicitMatch;
            //revisa si matchearia una linea con var 
            if (declaredType === 'var') {
                return;
            }

            //revisa si hace match con NEW_OBJECT_PATTERN 
            const newObjectMatch = rhs.match(NEW_OBJECT_PATTERN);
            // si el rhs es ej. New Tipo(...) y ese tipo es igual al tipo de la izquierda estas repitiendo lo mismo, hay hallazgo
            if (newObjectMatch && newObjectMatch[1] === declaredType) {
                findings.push(
                    where + ' - "' + declaredType + ' ' + varName +
                    '" repite el tipo que ya es evidente por "new ' + declaredType +
                    '(...)"; usa "var" en vez del tipo explicito'
                );
            //si el rhs es una llamada a un metodo async se reporta 
            } else if (ASYNC_CALL_PATTERN.test(rhs)) {
                findings.push(
                    where + ' - "' + declaredType + ' ' + varName +
                    '" declara el tipo de retorno de una llamada asincrona; usa "var" en vez de repetirlo'
                );
            }
        }
    });
}
