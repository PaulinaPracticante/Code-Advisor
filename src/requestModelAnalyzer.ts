// -----------------------------------------------------------------------------------
// ---- VERIFICACION DE MODELOS DE REQUEST: PROPIEDADES CON VALOR POR DEFAULT --------
// -----------------------------------------------------------------------------------

//corta cualquier linea que se un comentarios, que inicie con //
function stripLineComment(rawLine: string): string {
    const commentIndex = rawLine.indexOf('//');
    return commentIndex === -1 ? rawLine : rawLine.slice(0, commentIndex);
}

interface RequestModelConfig {
    classPattern: RegExp; // captura el nombre de la clase 
    missingDefaultPattern: RegExp; // si matchea, la propiedad NO tiene un valor por default, es un hallazgo
}

//Nombres que puede tener la clase donde esten los request
const REQUEST_NAME_SUFFIXES = ['Request', 'Dto', 'Input', 'Command', 'Query', 'Payload'];

//Nombres de carpetas donde puedan estar los archivos 
const REQUEST_FOLDER_KEYWORDS = ['request', 'dtos', 'dto', 'inputs', 'contracts'];

// Funcion para saber si una clase es un modelo de request su nombre termina con los nombres en REQUEST_NAME_SUFFIXES
function isRequestClassName(className: string): boolean {
    return REQUEST_NAME_SUFFIXES.some(suffix => new RegExp(`${suffix}$`, 'i').test(className));
}

function isInRequestFolder(fileLabel: string): boolean {
    const normalized = fileLabel.toLowerCase().replace(/\\/g, '/');
    return REQUEST_FOLDER_KEYWORDS.some(folder => normalized.includes(`/${folder}/`));
}

function extendsOrImplementsRequest(classDeclarationLine: string): boolean {
    return /\b(?:extends|implements|:)\s+[\w<>,\s]*Request/i.test(classDeclarationLine);
}

function isRequestModel(className: string, classDeclarationLine: string, fileLabel: string): boolean {
    return (
        isRequestClassName(className) ||
        isInRequestFolder(fileLabel) ||
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
    tsx: TS_CONFIG,
    js: JS_CONFIG,
    jsx: JS_CONFIG,
    php: PHP_CONFIG,
};

// Funcion principal
export function analyzeRequestModels(lines: string[], fileLabel: string, findings: string[]): void {
    const extension = fileLabel.split('.').pop() ?? ''; //determina la extension del archivo 
    const config = EXTENSION_TO_CONFIG[extension]; //determina la configuracion del archivo 
    if (!config) {
        return;
    }

    let insideRequestClass = false; //si actualmente esta dentro de una clase que califica como "request"
    let depth = 0; //profundidad de llaves para saber cuando se sale de la clase 

    lines.forEach((rawLine, i) => {
        const line = stripLineComment(rawLine).trim(); //limpia comentarios
        
        const classMatch = line.match(config.classPattern);
        if (classMatch) { //si la linea matchea 
            insideRequestClass = isRequestModel(classMatch[1], line, fileLabel); //evalua si el nombre de esa clase es de request
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

        //si la linea matchea con missingDefaultPattern agrega el hallazgo a findings 
        if (config.missingDefaultPattern.test(line)) {
            findings.push(fileLabel + ':' + (i + 1) + ' - La propiedad debe inicializar con un valor por default (ej. 0, "", string.Empty)');
        }
    });
}