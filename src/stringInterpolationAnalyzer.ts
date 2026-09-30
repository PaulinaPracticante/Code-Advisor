// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DE USO DE INTERPOLACION PARA CONCATENAR CADENAS CORTAS --------------
// ---------------------------------------------------------------------------------------

//Corta cualquier comentario 
function stripLineComment(rawLine: string): string {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

const STRING_LITERAL = `["'][^"']*["']`; //regex que matchea un literal simple entre comillas simples o dobles

// ---- C# ----
// literal + identificador o  identificador + literal, sin que el literal ya sea interpolado ($"...")
const CS_CONCAT_PATTERN = new RegExp(
    `(?<!\\$)(?:${STRING_LITERAL})\\s*\\+\\s*[A-Za-z_]\\w*|[A-Za-z_]\\w*\\s*\\+\\s*(?<!\\$)(?:${STRING_LITERAL})`
);
//descarta acumulacion tipo "total += ..." o "total = total + ..."
const CS_SELF_CONCAT_PATTERN = /^([A-Za-z_]\w*)\s*(\+=|=\s*\1\s*\+)/;

function analyzeCSharpConcat(lines: string[], fileLabel: string, findings:  string[]): void {
    //recorre linea por linea 
    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim();
        const where = fileLabel + ':' + (i + 1);

        if (CS_SELF_CONCAT_PATTERN.test(line)) { return; } //salta las que son self-contact

        if (CS_CONCAT_PATTERN.test(line)) { //si matchea, hay un finding 
            findings.push(where + ' - se concatena con "+"; usa un string interpolado ($"...") en vez de concatenar');
        }
    });
}

// ---- JavaScript / JavaScript ---- 
// literal + identificador o  identificador + literal
const JS_CONCAT_PATTERN = new RegExp(
    `(?:${STRING_LITERAL})\\s*\\+\\s*[A-Za-z_$][\\w$]*|[A-Za-z_$][\\w$]*\\s*\\+\\s*(?:${STRING_LITERAL})`
);
//descarta acumulacion tipo "total += ..." o "total = total + ..."
const JS_SELF_CONCAT_PATTERN = /^([A-Za-z_$][\w$]*)\s*(\+=|=\s*\1\s*\+)/;

function analyzeJsTsConcat(lines: string[], fileLabel: string, findings: string[]): void {
    // recorre linea por linea 
    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim();
        const where = fileLabel + ':' + (i + 1);

        if (JS_SELF_CONCAT_PATTERN.test(line)) { return; } //salta las que son self-contact

        if (JS_CONCAT_PATTERN.test(line)) { //si matchea, hay un finding
            findings.push(where + ' - se concatena con "+"; usa un template literal (`....${variable}...`) en vez de concatenar');
        }
    });
}

// ---- PHP ---- 
// literal . $identificador o  $identificador . literal
const PHP_CONCAT_PATTERN = new RegExp(
    `(?:${STRING_LITERAL})\\s*\\.\\s*\\$[A-Za-z_]\\w*|\\$[A-Za-z_]\\w*\\s*\\.\\s*(?:${STRING_LITERAL})`
);
//descarta acumulacion tipo "total += ..." o "total = total + ..."
const PHP_SELF_CONCAT_PATTERN = /^(\$[A-Za-z_]\w*)\s*(\.=|=\s*\1\s*\.)/;

function analyzePhpConcat(lines: string[], fileLabel: string, findings: string[]): void {
    //recorre linea por linea 
    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim();
        const where = fileLabel + ':' + (i + 1);

        if (PHP_SELF_CONCAT_PATTERN.test(line)) { return; } //salta las que son self-contact

        if (PHP_CONCAT_PATTERN.test(line)) { //si matchea, hay hallazgo
            findings.push(where + ' - se concatena con "."; usa interpolacion nativa ("...$variable...") en vez de concatenar');
        }
    });
}

// funcion prinicipal 
export function analyzeStringInterpolation(lines: string[], fileLabel: string, findings: string[]): void {
    if (fileLabel.endsWith('.cs')) {
        analyzeCSharpConcat(lines, fileLabel, findings);
    } else if (fileLabel.endsWith('.ts') || fileLabel.endsWith('.tsx') || fileLabel.endsWith('.js') || fileLabel.endsWith('jsx')) {
        analyzeJsTsConcat(lines, fileLabel, findings);
    } else if (fileLabel.endsWith('.php')) {
        analyzePhpConcat(lines, fileLabel, findings);
    }
}