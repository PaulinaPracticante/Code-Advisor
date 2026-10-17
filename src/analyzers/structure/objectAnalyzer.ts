// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DE USO DE "object" COMO TIPO GENERICO -------------------------------
// ---------------------------------------------------------------------------------------
import { ObjectUsageConfig, ObjectUsageLenguajeConfig } from "../../config/configLoader";


//Corta cualquier comentario de la linea, igual que en los demas analyzers
function stripLineComment(rawLine: string): string {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

// ---- C# ----

function buildObjectPatterns(watchedTypes: string[]) {
    const typesGroup = watchedTypes.join('|');
    return {
        decl: new RegExp(`^(?:(?:public|private|protected|internal|static|readonly|const)\\s+)*(?:${typesGroup})\\s+([A-Za-z_]\\w*)\\s*[=;]`),
        param: new RegExp(`\\b(?:${typesGroup})\\s+([A-Za-z_]\\w*)\\s*[,)]`),
        returnType: new RegExp(`^(?:(?:public|private|protected|internal|static|virtual|override|async)\\s+)+(?:${typesGroup})\\s+([A-Za-z_]\\w*)\\s*\\(`),
    }
}

function analyzeCSharpObjectUsage(lines: string[], fileLabel: string, findings: string[], changedLines: Set<number>, config: ObjectUsageConfig['csharp']): void {
    const patterns = buildObjectPatterns(config.watchedTypes);
    const exemptPatterns = config.exemptPatterns.map(p => new RegExp(p));
    const newObjectPattern = /\bnew\s+object\s*\(\s*\)/;

    lines.forEach((rawLine, i) => {
        if (!changedLines.has(i + 1)) { return; }
        const line = stripLineComment(rawLine).trim(); //quita comentarios
        const where = fileLabel + ':' + (i + 1);
        //si la linea es un override se ignora por completo 
        if (exemptPatterns.some(p => p.test(line))) { return; }

        //busca una variable declarada como object 
        const declMatch = line.match(patterns.decl);
        if (declMatch) {
            findings.push(where + ' -"' + declMatch[1] + '" se declara como "object"; usa el tipo concreto que se va a guardar');   
        }

        //busca una instancia vacia inutil
        if (newObjectPattern.test(line)) {
            findings.push(where + ' - "new object()" no aporta nada; instancia el tipo real que necesitas');
        }

        //solo si no encontro ya un retorno en esa linea y descarta object[]
        const returnMatch = line.match(patterns.returnType);
        if (returnMatch) {
            findings.push(where + ' - el metodo "' + returnMatch[1] +'" retorna "object"; declara el tipo real que retorna');
        } else {
            const paramMatch = line.match(patterns.param);
            if (paramMatch && !/object\s*\[\]/.test(line)) {
                findings.push(where + ' - el parametro "' + paramMatch[1] + '" es de tipo "object"; usa el tipo concreto que se espera recibir');
            }
        }
    });
}

// ---- TypeScript ----
const TS_NEW_OBJECT_PATTERN = /\bnew\s+Object\s*\(\s*\)/;

function buildTsObjectPattern(whatchedtypes: string[]): RegExp {
    const typesGroup = whatchedtypes.join('|');
    return new RegExp(`:\\s*(${typesGroup})\\b(?!\\s*[.\\w])`);
}

function analyzeTsObjectUsage(lines: string[], fileLabel: string, findings: string[], changedLines: Set<number>, config: ObjectUsageLenguajeConfig): void {
    const typePattern = buildTsObjectPattern(config.watchedTypes);
    const exemptPatterns = config.exemptPatterns.map(p => new RegExp(p));

    lines.forEach((rawLine, i) => {
        if (!changedLines.has(i + 1)) { return; }
        const line = stripLineComment(rawLine).trim();//elimina comentarios 
        const where = fileLabel + ':' + (i + 1);
        if (exemptPatterns.some(p => p.test(line))) { return; }

        //busca anotaciones de tipo : object o : Object
        const typeMatch = line.match(typePattern);
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

function buildJsDocObjectPattern(watchedTypes: string[]): RegExp {
    const typesGroup = watchedTypes.join('|');
    return new RegExp(`@(?:param|returns?|type)\\s*\\{\\s*(?:${typesGroup})\\s*\\}`);
}

function analyzeJsObjectUsage(lines: string[], fileLabel: string, findings: string[], changedLines: Set<number>, config: ObjectUsageLenguajeConfig): void {
    const jsdocPattern = buildJsDocObjectPattern(config.watchedTypes);
    const exemptPatterns = config.exemptPatterns.map(p => new RegExp(p));

    lines.forEach((rawLine, i) => {
        if (!changedLines.has(i + 1)) { return; }
        const strippedLine = stripLineComment(rawLine).trim();
        const line = rawLine.trim(); //elimina comentarios 
        const where = fileLabel + ':' + (i + 1);
        if (exemptPatterns.some(p => p.test(strippedLine))) { return; }

        //busca instancias new object()
        if (JS_NEW_OBJECT_PATTERN.test(strippedLine)) {
            findings.push(where + ' - "new Object()" no aporta nada; usa un literal "{}" o una clase concreta');
        }
        //se busca @param {Object}, @return {Object} o @type {Object}
        if (jsdocPattern.test(line)) {
            findings.push(where + ' - el JSDoc documenta el tipo como "Object"; describe la forma real del dato con un @typedef');
        }
    });
}

// Funcion principal 
export function analyzeObjectUsage(lines: string[], fileLabel: string, findings: string[], changedLines: Set<number>, config: ObjectUsageConfig): void {
    if (fileLabel.endsWith('.cs')) {
        analyzeCSharpObjectUsage(lines, fileLabel, findings, changedLines, config.csharp);
    } else if (fileLabel.endsWith('.ts')) {
        analyzeTsObjectUsage(lines, fileLabel, findings, changedLines, config.typescript); 
    } else if (fileLabel.endsWith('.js')) {
        analyzeJsObjectUsage(lines, fileLabel, findings, changedLines, config.javascript);
    }
}