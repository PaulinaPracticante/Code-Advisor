// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DE NOMBRES DE ARCHIVO -----------------------------------------------
// ---------------------------------------------------------------------------------------

import { matchesCase } from "../../config/namingConfig";


// ---------------------------------------------------------------------------------------
// ---- VERFICACION DE ARCHIVO NEXT ------------------------------------------------------

//detecta si la ruta del archivo cae dentro de una carpeta de rutas next (pages o app)
const NEXT_ROUTE_FOLDER_PATTERN = /(^|\/)(?:src\/)?(?:pages|app)\//;

//lista de regex que reconocen las formas mas comunes de exportar un componente de react 
const COMPONENT_EXPORT_PATTERNS: RegExp[] = [
    /^export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/,
	/^export\s+default\s+([A-Z][A-Za-z0-9_]*)\s*;?\s*$/,
	/^export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)/,
	/^export\s+(?:default\s+)?const\s+([A-Z][A-Za-z0-9_]*)\s*(?::|=)/,
	/^function\s+([A-Z][A-Za-z0-9_]*)/,
	/^const\s+([A-Z][A-Za-z0-9_]*)\s*(?::|=)/,
];

function fileExportsComponent(lines: string[]): boolean {
    //recorre todas las lineas del archivo 
    return lines.some(rawLine => {
        const commentIndex = rawLine.indexOf('//'); //corta cualquier comentario
        //recorta espacios y prueba si la linea coincide con alguno de COMPONENT_EXPORT_PATTERNS
        const line = (commentIndex === -1 ? rawLine: rawLine.slice(0, commentIndex)).trim();
        return COMPONENT_EXPORT_PATTERNS.some(pattern => pattern.test(line)); //si al menos una linea coincide devuelve true
    });
}

//normalza las lineas invertidas de windows
function isNextRouteFile(fileLabel: string): boolean {
    return NEXT_ROUTE_FOLDER_PATTERN.test(fileLabel.replace(/\\/g, '/'));
}

// ---------------------------------------------------------------------------------------
// ----VERIFICACION DE NOMBRE DE CONTROLADORES--------------------------------------------

//las reglas de controladores y modelos solo aplican en el repo PKT1_WEB2
const PKT1_WEB2_REPO_NAME = 'PKT1_WEB2';

//la ruta es relativa a la raiz del repo (asRelativePath no incluye el nombre del repo)
const CONTROLLERS_ROUTE_FOLDER_PATTERN = /^PKT1\/application\/controllers\//;
const CONTROLLERS_NAME_PATTERN = /^Cat[A-Z][A-Za-z0-9]*$/;

function isControllerRouteFile(fileLabel: string): boolean {
    return CONTROLLERS_ROUTE_FOLDER_PATTERN.test(fileLabel.replace(/\\/g, '/'));
}

// ---------------------------------------------------------------------------------------
// ----VERIFICACION DE NOMBRE DE MODELOS--------------------------------------------------

const MODEL_ROUTE_FOLDER_PATTERN = /^PKT1\/application\/models\//;
const MODEL_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*Model$/;

function isModelRouteFile(fileLabel: string): boolean {
    return MODEL_ROUTE_FOLDER_PATTERN.test(fileLabel.replace(/\\/g, '/'));
}


//saca el nombre del archivo sin carpetas ni extension 
function getBaseName(fileLabel: string): string {
    const normalized = fileLabel.replace(/\\/g, '/'); //normaliza las barras 
    const fileName = normalized.split('/').pop() ?? normalized; //se queda con el ultimo segmento de la ruta 
    return fileName.split('.')[0]; //corta en el primer punto, quedandose solo con el nombre antes de la extension
}

// funcion principal 
export function analyzeFileNaming(lines: string[], fileLabel: string, findings: string[], repoName: string): void {
    const baseName = getBaseName(fileLabel);

    if (repoName === PKT1_WEB2_REPO_NAME) {
        if (isControllerRouteFile(fileLabel)) {
            if (!CONTROLLERS_NAME_PATTERN.test(baseName)) {
                findings.push(fileLabel + ' - El archivo ' + baseName + ' (controlador) no sigue el formato CatNombre');
            }
            return;
        }

        if (isModelRouteFile(fileLabel)) {
            if (!MODEL_NAME_PATTERN.test(baseName)) {
                findings.push(fileLabel + ' - El archivo ' + baseName + ' (modelo) no sigue el formato NombreModel');
            }
            return;
        }
    }

    if (isNextRouteFile(fileLabel)) {
        if (!matchesCase(baseName, 'kebab-case')) {
            findings.push(fileLabel + ' - El archivo ' + baseName + ' no usa kebab-case');
        }
        return;
    }

    if (fileExportsComponent(lines)) {
        if (!matchesCase(baseName, 'PascalCase')) {
            findings.push(fileLabel + ' - El archivo ' + baseName + ' (componente) no usa PascalCase');
        }
        return;
    }

    if (!matchesCase(baseName, 'camelCase')) {
        findings.push(fileLabel + ' - El archivo ' + baseName + ' no usa camelCase');
    }
}