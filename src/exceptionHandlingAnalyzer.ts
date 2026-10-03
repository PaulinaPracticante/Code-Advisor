// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DE MANEJO DE EXCEPCIONES (try-catch, BD, transacciones, hilos) ------
// ---------------------------------------------------------------------------------------

//funcion que corta los comentarios, lo que venga despues de //
function stripLineComment(rawLine: string): string {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

//recibe archivo:linea, el arreglo findings y una lista de tablas de patrones, recoge cada tabla y si la linea matchea hay un hallago
function checkRiskyPatterns(
    line: string,
    where: string,
    findings: string[],
    tables: [RegExp, string][][]
): void {
    for (const table of tables) {
        for (const [pattern, label] of table) {
            if (pattern.test(line)) {
                findings.push(where + ' - "' + label + '" se usa fuera de un try-catch; envuelve esta operacion para controlar sus excepciones');
            }
        }
    }
}

// ---- C# ----
const CS_TRY_PATTERN = /\btry\b/; //detecta palabra try
const CS_CATCH_PATTERN = /\bcatch\b/; //detecta palabra catch
const CS_LOG_PATTERN = /\b(_?logger|Log|Trace)\.(Log|Error|Warn|Fatal|WriteLine)\s*\(/i; //detecta llamadas de logging, se usa para saber si un catcha registra el error 

//Arreglo de pares [regex, etiqueta] con las llamadas riesgosas que deberian estar protegidas por un try-catch
const CS_DB_PATTERNS: [RegExp, string][] = [
    [/\bSqlCommand\b/, 'SqlCommand'],
    [/\.ExecuteReader\s*\(/, 'ExecuteReader'],
    [/\.ExecuteNonQuery\s*\(/, 'ExecuteNonQuey'],
    [/\.ExecuteScalar\s*\(/, 'ExecuteScalar'],
    [/\.SaveChanges\s*\(/, 'SaveChanges'],
];
const CS_TX_PATTERNS: [RegExp, string][] = [
    [/\bBeginTransaction\s*\(/, 'BeginTransaction'],
    [/\bTransactionScope\b/, 'TrnsactionScope'],
    [/\.Commit\s*\(\s*\)/, 'Commit'],
    [/\.Rollback\s*\(\s*\)/, 'Rollback'],
];
const CS_THREAD_PATTERNS: [RegExp, string][] = [
    [/\bnew\s+Thread\s*\(/, 'new Thread'],
    [/\bTask\.Run\s*\(/, 'Task.Run'],
    [/\bParallel\.(For|ForEach)\s*\(/, 'Parallel.For/ForEach'],
    [/\bThreadPool\.QueueUserWorkItem\s*\(/, 'ThreadPool.QueueUserWorkItem'],
];

//funcion para el analisis de c#
function analyzeCSharpExceptionHandling(lines: string[], fileLabel: string, findings: string[]): void {
    let depth = 0; //contador de profundidad de las llaves acumulado 
    const tryDepths: number[] = []; //array con la que se abrio cada try activo, si est vacia no estamos dentro de ningun try 

    let insideCatch = false; //si esta dentro del catch o no 
    let catchDepth = 0;
    let catchStartLine = 0; //para saber en que linea empezo 
    let catchHasBody = false; //si tiene contenido o no 
    let catchLogged = false; //si tiene una llamada logging dentro de el 

    //por cada linea 
    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim(); //se limpia de comentarios 
        const where = fileLabel + ':' + (i + 1);

        const opens = (line.match(/{/g) || []).length; //se cuentan cuantas { trae la linea 
        const closes = (line.match(/}/g) || []).length; //se cuentan cuantas } trae la linea 
 
        //si ya estamos dentro de un catch 
        if (insideCatch) {
            if (line.length > 0 && line !== '{' && line !== '}') { catchHasBody = true; } //revisa si la linea tiene contenido real
            if (CS_LOG_PATTERN.test(line)) { catchLogged = true; } // si matchea con el patron de logging
        }

        //si la linea tiene catch
        if (CS_CATCH_PATTERN.test(line)) {
            insideCatch = true; //se marca como true 
            catchDepth = depth + opens; //se guarda en que profundidad quedara su cuerpo
            catchStartLine = i; //se guarda la linea
            catchHasBody = false; //se resetea a false para medir un catch nuevo
            catchLogged = false; //se resetea a false para medir un catch nuevo
        }

        // si la linea contiene un try
        if (CS_TRY_PATTERN.test(line)) {
            tryDepths.push(depth + opens); //se amplia la profunidad en la que vive el cuerpo del try 
        }

        const insideTry = tryDepths.length > 0;
        //si no estamos detro de ningun try se corre checkRiskyPatterns y contra las tablas de DB, transacciones e hilos 
        if (!insideTry) {
            checkRiskyPatterns(line, where, findings, [CS_DB_PATTERNS, CS_TX_PATTERNS, CS_THREAD_PATTERNS]);
        }

        // se actualiza depth 
        depth += opens - closes;

        // si la pila tiene algo y el depth cayo debajo de la profundidad donde se abrio el try mas reciente se saca pop de la pila 
        if (tryDepths.length > 0 && depth < tryDepths[tryDepths.length - 1]) {
            tryDepths.pop();
        }

        //si estabamos dentro de un catch y depth ya bajo por debajo del catchDepth, el catch se cerro 
        if (insideCatch && depth < catchDepth) {
            // si nunca tuvo contenido, el catch esta vacio
            if (!catchHasBody) {
                findings.push(fileLabel + ':' + (catchStartLine + 1) + ' - el catch esta vacio; maneja o registra la excepcion');
            // si tuvo contenido pero nunca vimos logging, no registra en bitacora
            } else if (!catchLogged) {
                findings.push(fileLabel + ':' + (catchStartLine + 1) + ' - el catch no registra el error en bitacora; agrega un logger.Error/_logger.LogError');
            }
            //si se logueo y no se reporta nada, se resetea el insideCatch
            insideCatch = false;
        }
    });
}

// ---- JavaScript / TypeScript ----
const JS_TRY_PATTERN = /\btry\b/; //busca palabra try
const JS_CATCH_PATTERN = /\bcatch\b/; //busca palabra catch
const JS_LOG_PATTERN = /\b(console\.(error|warn)|logger\.(error|warn)|log\.(error|warn))\s*\(/i; //detecta llamadas de logging, se usa para saber si un catcha registra el error

//Arreglo de pares [regex, etiqueta] con las llamadas riesgosas que deberian estar protegidas por un try-catch
const JS_DB_PATTERNS: [RegExp, string][] = [
    [/\.query\s*\(/, '.query'],
    [/\.execute\s*\(/, '.execute'],
    [/\bpool\.query\s*\(/, 'pool.query'],
    [/\.findOne\s*\(/, '.findOne'],
    [/\.save\s*\(/, '.save'],
];
const JS_TX_PATTERNS: [RegExp, string][] = [
    [/\bsequelize\.transaction\s*\(/, 'sequelize.transaction'],
    [/\.startTransaction\s*\(/, 'startTransaction'],
    [/\.commitTransaction\s*\(/, 'commitTransaction'],
    [/\.abortTransaction\s*\(/, 'abortTransaction'],
];
const JS_THREAD_PATTERNS: [RegExp, string][] = [
    [/\bnew\s+Worker\s*\(/, 'new Worker'],
    [/\bcluster\.fork\s*\(/, 'cluster.fork'],
    [/\bchild_process\.fork\s*\(/, 'child_process.fork'],
];

//funcion para el analisis de JavaScipt y TypeScript 
function analyzeJsTsExceptionHandling(lines: string[], fileLabel: string, findings: string[]): void {
    let depth = 0; //contador de profundidad de las llaves acumulado
    const tryDepths: number[] = []; //array con la que se abrio cada try activo, si est vacia no estamos dentro de ningun try 

    let insideCatch = false; // si esta dentro de un catch o no 
    let catchDepth = 0;
    let catchStartLine = 0; //linea en que empezo 
    let catchHasBody = false; // si el catch tiene contenido 
    let catchLogged = false; //si tiene una llamada logging dentro de el 

    //recorre linea por linea 
    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim(); //elimina comentarios 
        const where = fileLabel + ':' + (i + 1);

        const opens = (line.match(/{/g) || []).length; // cuenta las { que hay en una linea 
        const closes = (line.match(/}/g) || []).length; // cuenta las } que hay en una linea 

        // si esta dentro de un catch 
        if (insideCatch) {
            if (line.length > 0 && line !== '{' && line !== '}') { catchHasBody =  true; }; //revisa si la linea tiene contenido real
            if (JS_LOG_PATTERN.test(line)) { catchLogged = true; } // si matchea con el patron de logging
        }

        //si la linea tiene catch
        if (JS_CATCH_PATTERN.test(line)) {
            insideCatch = true; //se pone insideCatch como true 
            catchDepth =  depth + opens; //se guarda la profundidad en la que queda el cuerpo 
            catchStartLine = i; // se guarda la linea 
            catchHasBody = false; //se resetea para medir el proximo catch
            catchLogged = false; //se resetea para medir el proximo catch 
        }

        // si la linea tiene un try 
        if (JS_TRY_PATTERN.test(line)) {
            tryDepths.push(depth + opens); //se amplia la profunidad en la que vive el cuerpo del try 
        }

        const insideTry = tryDepths.length > 0;
        //si no estamos detro de ningun try se corre checkRiskyPatterns y contra las tablas de DB, transacciones e hilos 
        if (!insideTry) {
            checkRiskyPatterns(line, where, findings, [JS_DB_PATTERNS, JS_TX_PATTERNS, JS_THREAD_PATTERNS]);
        }

        // se actualiza depth 
        depth += opens - closes;

        // si la pila tiene algo y el depth cayo debajo de la profundidad donde se abrio el try mas reciente se saca pop de la pila
        if (tryDepths.length > 0 && depth < tryDepths[tryDepths.length - 1]) {
            tryDepths.pop();
        }

        //si estabamos dentro de un catch y depth ya bajo por debajo del catchDepth, el catch se cerro 
        if (insideCatch && depth < catchDepth) {
            // si el catch no tenia contenido, esta vacio 
            if (!catchHasBody) {
                findings.push(fileLabel + ':' + (catchStartLine + 1) + ' - el catch esta vacio; maneja o registra el error');
            // si tuvo contenido pero nunca vimos logging, no registra en bitacora
            } else if (!catchLogged) {
                findings.push(fileLabel + ':' + (catchStartLine + 1) + ' - el catch no registra el error en bitacora; agrega un console.error/logger.error');
            }
            insideCatch = false; //si se logueo y no se reporta nada, se resetea el insideCatch
        }
    });
}

// ---- PHP ---- 
const PHP_TRY_PATTERN = /\btry\b/; //busca la palabra try 
const PHP_CATCH_PATTERN = /\bcatch\b/; //busca la palabra catch 
const PHP_LOG_PATTERN = /\b(error_log\s*\(|Log::(error|warning)\s*\()/i; //detecta llamadas de logging, se usa para saber si un catcha registra el error

//Arreglo de pares [regex, etiqueta] con las llamadas riesgosas que deberian estar protegidas por un try-catch
const PHP_DB_PATTERNS: [RegExp, string][] = [
    [/->query\s*\(/, '->query'],
    [/->exec\s*\(/, '->exec'],
    [/\bmysqli_query\s*\(/, 'mysqli_query'],
    [/->prepare\s*\(/, '->prepare'],
];
const PHP_TX_PATTERNS: [RegExp, string][] = [
    [/->beginTransaction\s*\(/, '->beginTransaction'],
    [/->commit\s*\(\s*\)/, '->commit'],
    [/->rollBack\s*\(\s*\)/, '->rollBack'],
];

//funcion para el analisis de php
function analyzePhpExceptionHandling(lines: string[], fileLabel: string, findings: string[]): void {
    let depth = 0; //contador de profundidad de las llaves acumulado
    const tryDepths: number[] = []; //array con la que se abrio cada try activo, si est vacia no estamos dentro de ningun try

    let insideCatch = false; // si esta dentro de un catch o no 
    let catchDepth = 0;
    let catchStartLine = 0; // se guarda la linea 
    let catchHasBody = false; //si tiene contenido o no 
    let catchLogged = false; //si tiene una llamada logging dentro de el 

    //recorre linea por linea 
    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim(); //elimina los comentarios 
        const where = fileLabel + ':' + (i + 1);

        const opens = (line.match(/{/g) || []).length; //cuenta los { que hay en una linea 
        const closes = (line.match(/}/g) || []).length; // cuenta los } que hay en una linea  

        //si esta dentro de un catch 
        if (insideCatch) {
            if (line.length > 0 && line !== '{' && line !== '}') { catchHasBody = true; } //revisa si tiene contenido real 
            if (PHP_LOG_PATTERN.test(line)) { catchLogged = true; } // si matchea con el patron de logging
        }

        // si la linea tiene catch 
        if (PHP_CATCH_PATTERN.test(line)) {
            insideCatch =  true; // se pone el insideCatch como true 
            catchDepth = depth + opens; //se guarda la profundidad en la que queda el cuerpo 
            catchStartLine = i; //se guarda la linea 
            catchHasBody = false; //se resetea para medir el proximo catch 
            catchLogged = false; // se resetea para medir el proximo catch 
        }

        // si la linea tiene try 
        if (PHP_TRY_PATTERN.test(line)) {
            tryDepths.push(depth + opens); //se amplia la profunidad en la que vive el cuerpo del try 
        }

        const insideTry = tryDepths.length > 0;
        //si no estamos detro de ningun try se corre checkRiskyPatterns y contra las tablas de DB y transacciones
        if (!insideTry) {
            checkRiskyPatterns(line, where, findings, [PHP_DB_PATTERNS, PHP_TX_PATTERNS]);
        }

        depth += opens - closes; // se actualiza depth 

        // si la pila tiene algo y el depth cayo debajo de la profundidad donde se abrio el try mas reciente se saca pop de la pila
        if (tryDepths.length > 0 && depth < tryDepths[tryDepths.length - 1]) {
            tryDepths.pop();
        }

        //si estabamos dentro de un catch y depth ya bajo por debajo del catchDepth, el catch se cerro 
        if (insideCatch && depth < catchDepth) {
            // si el catch no tiene contenido, esta vacio 
            if (!catchHasBody) {
                findings.push(fileLabel + ':' + (catchStartLine + 1) + ' - el catch esta vacio; maneja o registra el error');
            // si tuvo contenido pero nunca vimos logging, no registra en bitacora
            } else if (!catchLogged) {
                findings.push(fileLabel + ':' + (catchStartLine + 1) + ' - el catch no registra el error en bitacora; agrega un error_log/log::error');
            }
            insideCatch = false; //si se logueo y no se reporta nada, se resetea el insideCatch
        }
    });
}

// funcion principal 
export function analyzeExceptionHandling(lines: string[], fileLabel: string, findings: string[]): void {
    if (fileLabel.endsWith('.cs')) {
        analyzeCSharpExceptionHandling(lines, fileLabel, findings);
    } else if (fileLabel.endsWith('.ts') || fileLabel.endsWith('.tsx') || fileLabel.endsWith('.js') || fileLabel.endsWith('jsx')) {
        analyzeJsTsExceptionHandling(lines, fileLabel, findings);
    } else if (fileLabel.endsWith('.php')) {
        analyzePhpExceptionHandling(lines, fileLabel, findings);
    }
}