// -------------------------------------------------------------------------------------------
// ---- VERIFICACION DE ESTRUCTURA DE CADA PROYECTO ------------------------------------------
// -------------------------------------------------------------------------------------------

import { matchesCase } from "../../config/namingConfig";

// -------------------------------------------------------------------------------------------
// ---- MANAGEMENT VIEW 2 -------------------------------------------------------------------- 
const MANAGEMENT_VIEW2_REPO_NAME = 'ManagementView_v2';

//carpetas que deben existir en el repo (rutas relativas a la raiz, sin "/" al final)
const MANAGMENT_VIEW2_REQUIRED_FOLDERS: string[] = [
    'public', 
    'public/assets',
    'src',
    'src/api/auth',
    'src/api/customers',
    'src/api/dashboard',
    'src/api/shipments',
    'src/shared/components',
];

//funcion que normaliza las barras invertidas
function normalizePath(folderPath: string): string {
    return folderPath.replace(/\\/g, '/');
}

//se queda con el ultimo segmento de la ruta (nombre de la carpeta)
function getFolderName(folderPath: string): string {
    return folderPath.split('/').pop() ?? folderPath;
}

//funcion principal
//recibe folderPaths: todas las carpetas del proyecto y repoName: nombre de la carpeta del workspace
export function analyzeFolderStructure(folderPaths: string[], repoName: string, findings: string[]): void {
    if (repoName !== MANAGEMENT_VIEW2_REPO_NAME) { return; }
    
    const normalizedPaths = folderPaths.map(normalizePath);

    //verifica que existan las carpetas obligatorias
    for (const requiredFolder of MANAGMENT_VIEW2_REQUIRED_FOLDERS) {
        //busc la carpeta sin importar las mayusculas, para quedarse con el nombre real que tiene en el repo 
        const actualPath = normalizedPaths.find(folderPaths => folderPaths.toLocaleLowerCase() === requiredFolder.toLocaleLowerCase());

        //verifica que exista la carpeta
        if (!actualPath) {
            findings.push('Estructura del proyecto - No se encontro la carpeta "' + requiredFolder + '"');
            continue;
        }

        //verifica que el nombre real de la carpeta este en PascalCase 
        const folderName = getFolderName(actualPath);
        if (!matchesCase(folderName, 'PascalCase')) { 
            findings.push(actualPath + ' - La carpeta ' + folderName + ' no usa PascalCase');
        }
    }

}