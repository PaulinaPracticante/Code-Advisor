// -----------------------------------------------------------------------------------
// ---- VERIFICACION DE MODELOS DE REQUEST: PROPIEDADES CON VALOR POR DEFAULT --------
// -----------------------------------------------------------------------------------
import { RequestModelsConfig } from "../../config/configLoader";

//corta cualquier linea que se un comentarios, que inicie con //
function stripLineComment(rawLine: string): string {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

interface RequestModelConfig {
    classPattern: RegExp; // captura el nombre de la clase 
    missingDefaultPattern: RegExp; // si matchea, la propiedad NO tiene un valor por default, es un hallazgo
}

// Funcion para saber si una clase es un modelo de request su nombre termina con los nombres en REQUEST_NAME_SUFFIXES
function isRequestClassName(className: string, suffixes: string[]): boolean {
    return suffixes.some(suffix => new RegExp(`${suffix}$`, 'i').test(className));
}

function isInRequestFolder(fileLabel: string, folders: string[]): boolean {
    const normalized = fileLabel.toLowerCase().replace(/\\/g, '/');
    return folders.some(folder => normalized.includes(`/${folder}/`));
}

function extendsOrImplementsRequest(classDeclarationLine: string): boolean {
    return /\b(?:extends|implements|:)\s+[\w<>,\s]*Request/i.test(classDeclarationLine);
}

function isRequestModel(className: string, classDeclarationLine: string, fileLabel: string, config: RequestModelsConfig): boolean {
    return (
        isRequestClassName(className, config.suffixes) ||
        isInRequestFolder(fileLabel, config.folders) ||
        extendsOrImplementsRequest(classDeclarationLine)
    );
}

const CSHARP_CONFIG: RequestModelConfig = {
    classPattern: /^(?:(?:public|private|protected|internal|static|abstract|sealed|partial)\s+)*class\s+([A-Za-z0-9_]*)/,
    // public int Cantidad { get; set; } (sin "= valor" antes del ";")
    missingDefaultPattern: /^(?:public|private|protected|internal)\s+(?:readonly\s+)?[\w<>[\],.?]+\s+[A-Za-z_][A-Za-z0-9_]*\s*\{\s*get;\s*(?:set;|init;)\s*\}\s*;?\s*$/,
};

const TS_CONFIG: RequestModelConfig = {
    classPattern: /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
    // "nombreCliente: string;" (si "= valor" antes del ";")
    missingDefaultPattern: /^(?:public|private|protected|readonly\s+)*[A-Za-z_$][A-Za-z0-9_$]*\??\s*:\s*[^=;]+;\s*$/,
};

const JS_CONFIG: RequestModelConfig = {
    classPattern: /^(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
    // "cantidad;" (campo de clase sin inicializador; JS no tiene tipos que validar)
    missingDefaultPattern: /^[A-Za-z_$][A-Za-z0-9_$]*\s*;\s*$/,
};

const PHP_CONFIG: RequestModelConfig = {
    classPattern: /^(?:abstract\s+|final\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/,
    // "public int $cantidad;" (sin "= valor" antes del ";")
    missingDefaultPattern: /^(?:public|private|protected)\s+\??(?:int|float|string|bool|array|object|mixed|[A-Z][A-Za-z0-9_]*)\s+\$[A-Za-z_][A-Za-z0-9_]*\s*;\s*$/,
};

//asocia cada extension de archivo con su configuracion de regex correspondiente 
const EXTENSION_TO_CONFIG: Record<string, RequestModelConfig> = {
    cs: CSHARP_CONFIG,
    ts: TS_CONFIG,
    js: JS_CONFIG,
    php: PHP_CONFIG,
};

// Funcion principal
export function analyzeRequestModels(lines: string[], fileLabel: string, findings: string[], changedLines: Set<number>, config: RequestModelsConfig): void {
    const extension = fileLabel.split('.').pop() ?? ''; //determina la extension del archivo
    const extensionConfig = EXTENSION_TO_CONFIG[extension]; //determina la configuracion de regex del archivo
    if (!extensionConfig) {
        return;
    }

    let insideRequestClass = false; //si actualmente esta dentro de una clase que califica como "request"
    let depth = 0; //profundidad de llaves para saber cuando se sale de la clase

    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim(); //limpia comentarios

        const classMatch = line.match(extensionConfig.classPattern);
        if (classMatch) { //si la linea matchea
            insideRequestClass = isRequestModel(classMatch[1], line, fileLabel, config); //evalua si el nombre de esa clase es de request
            depth = 0; //reinicia depth a 0
        }

        if (!insideRequestClass) { // si no esta dentro de una request ignora la linea 
            return;
        }

        // si esta dentro se actualiza depth segun llaves abiertas o cerradas, y sale de la clase cuando le corresponde 
        if (line.includes('{')) { 
            depth++;
        }

        if (line.includes('}')) {
            depth--;
            if(depth <= 0) {
                insideRequestClass = false;
                return;
            }
        }

        const isOptionalProperty = /\?\s*:/.test(line);
        const isReadonlyProperty = /\breadonly\b/.test(line);
        //si la linea matchea con missingDefaultPattern agrega el hallazgo a findings, salvo que el tipo
        //de propiedad (opcional/readonly) este explicitamente excluido por la config
        if (extensionConfig.missingDefaultPattern.test(line) && changedLines.has(i + 1)) {
            const skipOptional = isOptionalProperty && !config.checkOptionalProperties;
            const skipReadonly = isReadonlyProperty && !config.checkReadonlyProperties;
            if (!skipOptional && !skipReadonly) {
                findings.push(fileLabel + ':' + (i + 1) + ' - La propiedad debe inicializar con un valor por default (ej. 0, "", string.Empty)');
            }
        }
    });
}