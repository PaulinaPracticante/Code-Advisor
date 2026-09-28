// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DE USO DE "object" COMO TIPO GENERICO -------------------------------
// ---------------------------------------------------------------------------------------

//Corta cualquier comentario de la linea, igual que en los demas analyzers
function stripLineComment(rawLine: string): string {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

// ---- C# ----
const CS_OBJECT_DECL_PATTERN = /^(?:(?:public|private|protected|internal|static|readonly|const)\s+)*object\s+([A-Za-z_]\w*)\s*[=;]/;
const CS_OBJECT_PARAM_PATTERN = /\bobject\s+([A-Za-z_]\w*)\s*[,)]/;
const CS_OBJECT_RETURN_PATTERN = /^(?:(?:public|private|protected|internal|static|virtual|override|async)\s+)+object\s+([A-Za-z_]\w*)\s*\(/;
const CS_NEW_OBJECT_PATTERN = /\bnew\s+object\s*\(\s*\)/;
const CS_EQUALS_OVERRIDE_PATTERN = /\bEquals\s*\(\s*object\s+\w+\s*\)/;

function analyzeCSharpObjectUsage(lines: string[], fileLabel: string, findings: string[]): void {
    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim(); //quita comentarios
        const where = fileLabel + ':' + (i + 1);
        //si la linea es un override se ignora por completo 
        if (CS_EQUALS_OVERRIDE_PATTERN.test(line)) { return; }

        //busca una variable declarada como object 
        const declMatch = line.match(CS_OBJECT_DECL_PATTERN)
        if (declMatch) {
            findings.push(where + ' -"' + declMatch[1] + '" se declara como "object"; usa el tipo concreto que se va a guardar');   
        }

        //busca una instancia vacia inutil
        if (CS_NEW_OBJECT_PATTERN.test(line)) {
            findings.push(where + ' - "new object()" no aporta nada; instancia el tipo real que necesitas');
        }

        //solo si no encontro ya un retorno en esa linea y descarta object[]
        const returnMatch = line.match(CS_OBJECT_RETURN_PATTERN);
        if (returnMatch) {
            findings.push(where + ' - el metodo "' + returnMatch[1] +'" retorna "object"; declara el tipo real que retorna');
        } else {
            const paramMatch = line.match(CS_OBJECT_PARAM_PATTERN);
            if (paramMatch && !/object\s*\[\]/.test(line)) {
                findings.push(where + ' - el parametro "' + paramMatch[1] + '" es de tipo "object"; usa el tipo concreto que se espera recibir');
            }
        }
    });
}

// ---- TypeScript ----
const TS_OBJECT_TYPE_PATTERN = /:\s*(object|Object)\b(?!\s*[.\w])/;
const TS_NEW_OBJECT_PATTERN = /\bnew\s+Object\s*\(\s*\)/;

function analyzeTsObjectUsage(lines: string[], fileLabel: string, findings: string[]): void {
    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim();//elimina comentarios 
        const where = fileLabel + ':' + (i + 1);

        //busca anotaciones de tipo : object o : Object
        const typeMatch = line.match(TS_OBJECT_TYPE_PATTERN);
        if (typeMatch) {
            findings.push(where + ' - se usa"' + typeMatch[1] + '" como tipo; declara una interfaz/type con las propiedades reales');
        }
        //busca uns instancia vacia inutil 
        if (TS_NEW_OBJECT_PATTERN.test(line)) {
            findings.push(where + ' - "new Object()" no aporta nada; usa un literal "{}" o una clase concreta');
        }
    });
}

// ---- JavaScript ----
const JS_NEW_OBJECT_PATTERN = /\bnew\s+Object\s*\(\s*\)/;
const JSDOC_OBJECT_PATTERN = /@(?:param|returns?|type)\s*\{\s*Object\s*\}/;

function analyzeJsObjectUsage(lines: string[], fileLabel: string, findings: string[]): void {
    lines.forEach((rawLine, i) => {
        const line = rawLine.trim(); //elimina comentarios 
        const where = fileLabel + ':' + (i + 1);

        //busca instancias new object()
        if (JS_NEW_OBJECT_PATTERN.test(stripLineComment(rawLine).trim())) {
            findings.push(where + ' - "new Object()" no aporta nada; usa un literal "{}" o una clase concreta');
        }
        //se busca @param {Object}, @return {Object} o @type {Object}
        if (JSDOC_OBJECT_PATTERN.test(line)) {
            findings.push(where + ' - el JSDoc documenta el tipo como "Object"; describe la forma real del dato con un @typedef');
        }
    });
}

// Funcion principal 
export function analyzeObjectUsage(lines: string[], fileLabel: string, findings: string[]): void {
    if (fileLabel.endsWith('.cs')) {
        analyzeCSharpObjectUsage(lines, fileLabel, findings);
    } else if (fileLabel.endsWith('.ts') || fileLabel.endsWith('.tsx')) {
        analyzeTsObjectUsage(lines, fileLabel, findings); 
    } else if (fileLabel.endsWith('.js') || fileLabel.endsWith('.jsx')) {
        analyzeJsObjectUsage(lines, fileLabel, findings);
    }
}