// -----------------------------------------------------------------------------------------
// ---- VERIFICACION DE QUE LOS COMPONENTES ESTEN EN LA CARPTEA component / components -----
// -----------------------------------------------------------------------------------------

import { ComponentLocationConfig } from "../../config/configLoader";
import { fileExportsComponent } from "../../shared/componentDetection";

//extensiones en las que puede vivir un componente 
const COMPONENT_EXTENSION_PATTERN = /\.(jsx|tsx|js|ts)$/;
//en .js/.ts solo se considera si regresa JSX 
const JSX_RETURN_PATTERN = /return\s*\(?\s*<[A-Za-z>]/;
//archivos de prueba o historias, no son componentes reales 
const TEST_FILE_PATTERN = /\.(test|spec|stories)\.(jsx|tsx|js|ts)$/;

//normaliza las barras de windows y separa las rutas en carpetas + nombre de archivo
function splitPath(fileLabel: string): { folders: string[]; baseName: string}{
    const parts = fileLabel.replace(/\\/g, '/').split('/');
    const fileName = parts.pop() ?? '';
    return { folders: parts.map(part => part.toLowerCase()), baseName: fileName.split('.')[0] };
} 

// decide si el archivo es un componente de react 
function isComponentFile(lines: string[], filelabel: string): boolean {
    if (!COMPONENT_EXTENSION_PATTERN.test(filelabel) || TEST_FILE_PATTERN.test(filelabel)) {return false; }
    if (!fileExportsComponent(lines)) { return false; }
    if (/\.(jsx|tsx)$/.test(filelabel)) { return true; }
    return JSX_RETURN_PATTERN.test(lines.join('\n'));
}

//funcion principal: reporta componentes que no estan dentro de una carpeta de componentes 
export function analyzeComponentLocation(lines: string[], fileLabel: string, findings: string[], config: ComponentLocationConfig): void {
    if (!isComponentFile(lines, fileLabel)) { return; }
    const { folders, baseName } = splitPath(fileLabel);

    //achivos de entrada (App, main, index...) no tiene que ir en components
    if (config.exemptFiles.includes(baseName)) { return; }
    //rutas de next, pantallas o vistas tampoco 
    if (folders.some(folder => config.exemptFolders.includes(folder))) { return; }

    const isInComponentFolder = folders.some(folders => config.folders.includes(folders));
    if(!isInComponentFolder) {
        findings.push(fileLabel + ' - El componente ' + baseName + ' debe estar dentro de una carpeta ' + config.folders.join('/'));
    }
}