// -------------------------------------------------------------------------------------------
// ---- VERIFICACION DE ESTRUCTURA DE CADA PROYECTO ------------------------------------------
// -------------------------------------------------------------------------------------------

import { matchesCase } from "../../config/namingConfig";

interface RepoFolderRules {
    requiredFolders: string[];
    checkPascalCase: boolean;
    checkKebabCase: boolean;
}
// -------------------------------------------------------------------------------------------
// ---- MANAGEMENT VIEW 2 -------------------------------------------------------------------- 
const MANAGEMENT_VIEW2_REPO_NAME = 'ManagementView_v2';

//carpetas que deben existir en el repo (rutas relativas a la raiz, sin "/" al final)
const MANAGMENT_VIEW2_REQUIRED_FOLDERS: string[] = [
    'public', 
    'public/assets',
    'src',
    'src/hooks',
    'src/api/auth',
    'src/api/customers',
    'src/api/dashboard',
    'src/api/shipments',
    'src/shared/components',
];


// ------------------------------------------------------------------------------------------
// ----ONSITE V2 ----------------------------------------------------------------------------

const ONSITE_V2_REPO_NAME = 'OnSiteV2_MX';

const ONSITE_V2_REQUIRED_FOLDERS: string[] = [
    'src',
    'src/actions',
    'src/component',
    'src/component/cards',
    'src/component/inputs',
    'src/components/navigation',
    'src/components/navigation/drawer',
    'src/components/navigation/sidebar',
    'src/components/navigation/tabs',
    'src/components/pagination',
    'src/components/typography',
    'src/interfaces',
    'src/interfaces/auth',
    'src/interfaces/locations',
    'src/interfaces/shipments',
    'src/interfaces/tables',
]

//funcion que normaliza las barras invertidas
function normalizePath(folderPath: string): string {
    return folderPath.replace(/\\/g, '/');
}

//se queda con el ultimo segmento de la ruta (nombre de la carpeta)
function getFolderName(folderPath: string): string {
    return folderPath.split('/').pop() ?? folderPath;
}

const REQUIRED_FOLDERS_BY_REPO: Record<string, RepoFolderRules> = {
    [MANAGEMENT_VIEW2_REPO_NAME]: { requiredFolders: MANAGMENT_VIEW2_REQUIRED_FOLDERS, checkPascalCase: true, checkKebabCase: false },
    [ONSITE_V2_REPO_NAME]: { requiredFolders: ONSITE_V2_REQUIRED_FOLDERS, checkPascalCase: false, checkKebabCase: true }
};

//funcion principal
//recibe folderPaths: todas las carpetas del proyecto y repoName: nombre de la carpeta del workspace
export function analyzeFolderStructure(folderPaths: string[], repoName: string, findings: string[]): void {
    const rules = REQUIRED_FOLDERS_BY_REPO[repoName];
    if (!rules) { return; }
    
    const normalizedPaths = folderPaths.map(normalizePath);

    //verifica que existan las carpetas obligatorias
    for (const requiredFolder of rules.requiredFolders) {
        //busc la carpeta sin importar las mayusculas, para quedarse con el nombre real que tiene en el repo 
        const actualPath = normalizedPaths.find(folderPaths => folderPaths.toLocaleLowerCase() === requiredFolder.toLocaleLowerCase());

        //verifica que exista la carpeta
        if (!actualPath) {
            findings.push('Estructura del proyecto - No se encontro la carpeta "' + requiredFolder + '"');
            continue;
        }

        //verifica que el nombre real de la carpeta este en PascalCase 
        const folderName = getFolderName(actualPath);
        if (rules.checkPascalCase && !matchesCase(folderName, 'PascalCase')) { 
            findings.push(actualPath + ' - La carpeta ' + folderName + ' no usa PascalCase');
        }

        if (rules.checkKebabCase && !matchesCase(folderName, 'kebab-case')) {
            findings.push(actualPath + ' - La carpeta ' + folderName + ' no usa kebab-case');
        }
    }

}