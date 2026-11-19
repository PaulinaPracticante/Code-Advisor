// -------------------------------------------------------------------------------------------
// ---- VERIFICACION DE ESTRUCTURA DE CADA PROYECTO ------------------------------------------
// -------------------------------------------------------------------------------------------

import { FolderNamingConfig, FolderRepoRule } from "../../config/configLoader";
import { matchesCase } from "../../config/namingConfig";
import { Finding, pushFinding } from "../../shared/finding";

//las carpetas obligatorias y la convencion de nombres de cada repositorio ya no estan aqui: salen de la configuracion
//(folderNaming.repos en configLoader.ts), el gerente las edita en el panel de estandares

//funcion que normaliza las barras invertidas
function normalizePath(folderPath: string): string {
    return folderPath.replace(/\\/g, '/');
}

//deja una ruta escrita por el gerente como las que regresa el workspace: sin "./" al inicio ni "/" al inicio o al final
function normalizeRequiredFolder(folderPath: string): string {
    return normalizePath(folderPath.trim()).replace(/^\.\//, '').replace(/^\/+|\/+$/g, '');
}

//se queda con el ultimo segmento de la ruta (nombre de la carpeta)
function getFolderName(folderPath: string): string {
    return folderPath.split('/').pop() ?? folderPath;
}

//reglas del repositorio, se busca por el nombre de su carpeta sin importar mayusculas ni espacios de mas
function findRepoRule(repos: FolderRepoRule[], repoName: string): FolderRepoRule | undefined {
    const wanted = repoName.trim().toLowerCase();
    return repos.find(repo => repo.name.trim().toLowerCase() === wanted);
}

//funcion principal
//recibe folderPaths: todas las carpetas del proyecto y repoName: nombre de la carpeta del workspace
export function analyzeFolderStructure(folderPaths: string[], repoName: string, findings: Finding[], config: FolderNamingConfig): void {
    const rules = findRepoRule(config.repos, repoName);
    if (!rules) { return; }

    const normalizedPaths = folderPaths.map(normalizePath);

    //verifica que existan las carpetas obligatorias
    for (const configuredFolder of rules.requiredFolders) {
        const requiredFolder = normalizeRequiredFolder(configuredFolder);
        if (requiredFolder === '') { continue; }

        //busc la carpeta sin importar las mayusculas, para quedarse con el nombre real que tiene en el repo
        const actualPath = normalizedPaths.find(folderPath => folderPath.toLocaleLowerCase() === requiredFolder.toLocaleLowerCase());

        //verifica que exista la carpeta
        if (!actualPath) {
            pushFinding(findings, 'folderNaming', 'Estructura del proyecto', 'No se encontro la carpeta "' + requiredFolder + '"', {
                suggestion: 'Crea la carpeta "' + requiredFolder + '".',
            });
            continue;
        }

        //verifica que el nombre real de la carpeta use la convencion del repositorio
        const folderName = getFolderName(actualPath);
        if (rules.naming === 'PascalCase' && !matchesCase(folderName, 'PascalCase')) {
            pushFinding(findings, 'folderNaming', actualPath, 'La carpeta ' + folderName + ' no usa PascalCase', {
                suggestion: 'Renombra la carpeta "' + folderName + '" a PascalCase.',
            });
        }

        if (rules.naming === 'kebab-case' && !matchesCase(folderName, 'kebab-case')) {
            pushFinding(findings, 'folderNaming', actualPath, 'La carpeta ' + folderName + ' no usa kebab-case', {
                suggestion: 'Renombra la carpeta "' + folderName + '" a kebab-case.',
            });
        }
    }

}
