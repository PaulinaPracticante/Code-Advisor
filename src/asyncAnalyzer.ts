// --------------------------------------------------------------------------------------
// ---- VERIFICACION DE PROGRAMACION ASINCRONA (async / await) EN OPERACIONES E/S -------
// --------------------------------------------------------------------------------------

//Detecta el inicio de una declaracion de metodo, si no hace match con esto no se analiza 
const METHOD_PATTERN = /^(?:public|private|protected|internal|static)(?:\s+(?:public|private|protected|internal|static|virtual|override|sealed))*\s+(async\s+)?([\w<>[\],.?\s]+?)\s+([A-Za-z_]\w*)\s*\(/;

//recornoce la firma tipica de un manejador de eventos, para no marcar como erro los async void 
const EVENT_HANDLER_PATTERN = /\(\s*object\s+\w+\s*,\s*\w*EventArgs\s+\w+\s*\)/;

//busca la palabra await
const AWAIT_PATTERN = /\bawait\b/;

//detecta las formas de esperar a una tarea de forma sincrona 
const BLOCKING_PATTERN = /\.Result\b|\.Wait\(\s*\)|\.GetAwaiter\(\)\.GetResult\(\)/;

//detecta Thread.Sleep
const THREAD_SLEEP_PATTERN = /\bThread\.Sleep\s*\(/;

const ASYNC_CALL_PATTERN = /\b([A-Za-z_]\w*Async)\s*\(/; //detecta cualquier llamada a un metodo que termine en async 
//define si una llamada esta bien, si tiene await, hace return, se asigna una variable.
const ASYNC_CALL_HANDLED_PATTERN = /\bawait\b|\breturn\b|=\s*[^=]|Task\.(?:WhenAll|WhenAny)/; 

//tabla de operaciones de E/S sincronas cada una con su equivalente asincrono sugerido
const SYNC_IO_CALLS: [RegExp, string, string][] = [
    [/\.SaveChanges\s*\(/,            'SaveChanges',       'SaveChangesAsync'],
    [/\bFile\.ReadAllText\s*\(/,      'File.ReadAllText',  'File.ReadAllTextAsync'],
    [/\bFile\.WriteAllText\s*\(/,     'File.WriteAllText', 'File.WriteAllTextAsync'],
    [/\bFile\.AppendAllText\s*\(/,    'File.AppendAllText', 'File.AppendAllTextAsync'],
    [/\bFile\.ReadAllBytes\s*\(/,     'File.ReadAllBytes', 'File.ReadAllBytesAsync'],
    [/\.ReadToEnd\s*\(/,              'ReadToEnd',         'ReadToEndAsync'],
    [/\.ExecuteReader\s*\(/,          'ExecuteReader',     'ExecuteReaderAsync'],
    [/\.ExecuteNonQuery\s*\(/,        'ExecuteNonQuery',   'ExecuteNonQueryAsync'],
    [/\.Send\s*\(\s*\w*[Rr]equest/,   'HttpClient.Send',   'SendAsync'],
];

//detecta consultas de Entity Framework hecha de forma sincrona
const EF_CONTEXT_PATTERN = /\b_?(?:context|db|dbContext)\b\./i;
const EF_SYNC_QUERY_PATTERN = /\.(ToList|FirstOrDefault|SingleOrDefault|Any|Count|Find)\s*\(/;

function analyzeCSharpAsync(lines: string[], fileLabel: string, findings: string[]): void {
    
    //variables que llevan contexto del metodo que se esta recorriendo actualmente
    let insideMethod = false;
    let methodStartLine = 0;
    let methodName = '';
    let isAsync = false;
    let sawAwait = false;
    let depth = 0;
    let bodyStarted = false;

    lines.forEach((rawLine, i) => {
        const line = rawLine.trim();
        const where = fileLabel + ':' + (i + 1);

        const methodMatch = line.match(METHOD_PATTERN);
        //cuando una liena matchea con METHOD_PATTERN y no estamos dentro de un metodo 
        if (methodMatch && !insideMethod) {
            insideMethod = true; //se marca como true 
            methodStartLine = i; //se resetea el estado 
            isAsync = !!methodMatch[1]; //
            methodName = methodMatch[3];
            sawAwait = false; 
            depth = 0;
            bodyStarted = false;

            const returnType = methodMatch[2].trim();
            //si es async void y no un event handler lo reporta 
            if (isAsync && returnType === 'void' && !EVENT_HANDLER_PATTERN.test(line)) {
                findings.push(where + ' - el metodo"' + methodName +
                    '"es async void; cambialo a "async Task" para poder esperarlo y capturar sus excepciones');
            }
        }

        if (!insideMethod) {
            return;
        }

        //si hay await se marca como true
        if (AWAIT_PATTERN.test(line)) { sawAwait = true; }

        //si hay bloqueos sincronos, hay hallazgo
        if (BLOCKING_PATTERN.test(line)) {
            findings.push(where + ' - evita bloquear con .Result/.Wait()/GetResult(); usa "await" para no provocar deadlocks');
        }

        //si hay un Thread.Sleep en un metodo async, hay hallazgo 
        if (isAsync && THREAD_SLEEP_PATTERN.test(line)) {
            findings.push(where + ' - usa "await Task.Delay(...)" en lugar de Thread.Sleep dentro de un metodo async');
        }

        //llamadas a metodos Async que no se esperan o retornan, hay hallazgo
        const asyncCall = line.match(ASYNC_CALL_PATTERN);
        if (asyncCall && asyncCall[1] !== methodName && !ASYNC_CALL_HANDLED_PATTERN.test(line)) {
            findings.push(where + ' - la llamada a "' + asyncCall[1] +
                '" no se espera; agrega "await" para no dejar la tarea sin controlar');
        }

        //cualquier llamada de la tabla SYNC_IO_CALLS que no incluya el async en la misma linea, hay hallazgo con sugerencia 
        for (const [pattern, syncName, asyncName] of SYNC_IO_CALLS) {
            if (pattern.test(line) && !line.includes(asyncName)) {
                findings.push(where + ' - "' + asyncName + '"es una operacion de E/S sincrona; usa "await ' +
                    asyncName + '(...)" y marca el metodo como async');
            }
        }

        //consultas EF Core sincronas sobre context/db/dbContext, hallazgo 
        const efMatch = line.match(EF_SYNC_QUERY_PATTERN);
        if (efMatch && EF_CONTEXT_PATTERN.test(line)) {
            findings.push(where + ' - la consulta a base de datos usa "' + efMatch[1] + '()"; usa "await ' +
                efMatch[1] + 'Async()" de EF Core');
        }
 
        //cuenta las llaves { y }
        const opens = (line.match(/{/g) || []).length;
        const closes = (line.match(/}/g) || []).length;
        if (opens > 0) { bodyStarted = true; }
        depth += opens - closes;

        const isExpressionBodied = !bodyStarted && line.includes('=>') && line.endsWith(';');

        //sabe cuando el depth vuelve a 0 o detecta metodos (=> algo; sin llaves) 
        if ((bodyStarted && depth <= 0) || isExpressionBodied) {
            //al cerrar el metodo si era async pero nunca vio el await se reporta que el async o falta esperar algo 
            if (isAsync && !sawAwait) {
                findings.push(fileLabel + ':' + (methodStartLine + 1) + ' - el metodo "' + methodName +
                    '" es async pero no contiene ningun await; quita "async" o espera la operacion de E/S');
            }
            insideMethod = false; //se resetea para detectar el siguiente metodo 
        }
    });
}


// ---- JavaScript / Typescript ----
const JS_RESERVED_KEYWORDS = /^(if|for|while|switch|catch|function|return|new|typeof)$/;

//function foo(...) / async function foo(...)
const JS_FUNCTION_DECL_PATTERN = /^(async\s+)?function\s*([A-Za-z_$][\w$]*)?\s*\(/;
//const foo = (...) => / const foo = async (...) =>
const JS_ARROW_FUNCTION_PATTERN = /^(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?\([^)]*\)\s*=>/;
//metodo de clase u objeto: foo(...) { / async foo(...) {
const JS_CLASS_METHOD_PATTERN = /^(async\s+)?(?:static\s+)?(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/;

const JS_SYNC_IO_CALLS: [RegExp, string, string][] = [
    [/\bfs\.readFileSync\s*\(/, 'fs.readFileSync', 'fs.promises.readFile'],
    [/\bfs\.writeFileSync\s*\(/, 'fs.writeFileSync', 'fs.promises.writeFile'],
    [/\bexecSync\s*\(/,          'execSync',         'exec (promisify)'],
];

const JS_ASYNC_CALL_PATTERN = /\b([A-Za-z_$][\w$]*Async)\s*\(/;
const JS_ASYNC_CALL_HANDLED_PATTERN = /\bawait\b|\breturn\b|\.then\s*\(|=\s*[^=]/;

const JS_BLOCKING_PATTERN = /\bdeasync\s*\(|\.open\s*\(\s*['"][A-Z]+['"]\s*,\s*[^,]+,\s*false\s*\)/;

function analyzeJsTsAsync(lines: string[], fileLabel: string, findings: string[]): void {
    let insideFunction = false;
    let functionStartLine = 0;
    let functionName = '';
    let isAsync =  false;
    let sawAwait = false;
    let depth = 0;
    let bodyStarted = false;

    lines.forEach((rawLine, i ) => {
        const line  = rawLine.trim();
        const where =  fileLabel + ':' + (i + 1);

        if (!insideFunction) {
            let match =  line.match(JS_FUNCTION_DECL_PATTERN);
            let candidateAsync = false;
            let candidateName = '';

            if (match) {
                candidateAsync = !!match[1];
                candidateName = match[2] || '(anonima)';
            } else {
                match = line.match(JS_ARROW_FUNCTION_PATTERN);
                if (match) {
                    candidateName = match[1];
                    candidateAsync = !!match[2];
                } else {
                    match = line.match(JS_ARROW_FUNCTION_PATTERN);
                    if (match) {
                        candidateName = match[1];
                        candidateAsync = !!match[2];
                    } else {
                        const classMatch = line.match(JS_CLASS_METHOD_PATTERN);
                        if (classMatch && !JS_RESERVED_KEYWORDS.test(classMatch[2])) {
                            match = classMatch;
                            candidateAsync = !!classMatch[1];
                            candidateName = classMatch[2];
                        } else {
                            match = null;
                        }
                    }
                }

                if (match) {
                    insideFunction = true;
                    functionStartLine = i;
                    functionName = candidateName;
                    isAsync = candidateAsync;
                    sawAwait = false;
                    depth = 0;
                    bodyStarted = false;
                }
            }

            if (!insideFunction) {
                return;
            }

            if (AWAIT_PATTERN.test(line)) { sawAwait =  true; }

            if (JS_BLOCKING_PATTERN.test(line)) {
                findings.push(where + ' - evitar bloquear la ejecucion (deasync, XHR sincrono); usa "await" con una API asincrona');
            }

            const asyncCall = line.match(JS_ASYNC_CALL_PATTERN);
            if (asyncCall && asyncCall[1] !== functionName && !JS_ASYNC_CALL_HANDLED_PATTERN.test(line)) {
                findings.push(where + ' - la llamada a "' + asyncCall[1] +
                    '" no se espera; agrega "await" para no dejar la promesa sin controlar');
            }

            for (const [pattern, syncName, asyncName] of JS_SYNC_IO_CALLS) {
                if (pattern.test(line)) {
                    findings.push(where + ' -"' + syncName + '" es una operacion de E/S sincrona; usa "await ' +
                        asyncName + '(...)" en su lugar');
                }
            }

            const opens = (line.match(/{/g) || []).length;
            const closes = (line.match(/}/g) || []).length;
            if (opens > 0) { bodyStarted = true;}
            depth += opens - closes;

            const isExpressionBodied = !bodyStarted && line.includes('=>') && line.endsWith(';');

            if ((bodyStarted && depth <= 0) || isExpressionBodied) {
                if (isAsync && !sawAwait) {
                    findings.push(fileLabel + ':' + (functionStartLine + 1) + ' - la funcion "' + functionName +
                        '" es async pero no contiene ningun await; quita "async" o espera la operacion de E/S');
                }
                insideFunction = false;
            }
        }
    });
}

//funcion principal para el analisis
export function analyzeAsyncUsage(lines: string[], fileLabel: string, findings: string[]): void {
    if (fileLabel.endsWith('.cs')) {
        analyzeCSharpAsync(lines, fileLabel, findings);
    } else if (fileLabel.endsWith('.ts') || fileLabel.endsWith('.tsx') || fileLabel.endsWith('.js') || fileLabel.endsWith('.jsx')) {
        analyzeJsTsAsync(lines, fileLabel, findings);
    }
}