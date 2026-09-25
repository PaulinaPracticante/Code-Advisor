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

//funcion principal para el analisis
export function analyzeAsyncUsage(lines: string[], fileLabel: string, findings: string[]): void {
    //si el archivo no es c# no hace nada 
    if (!fileLabel.endsWith('cs')) {
        return;
    }

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