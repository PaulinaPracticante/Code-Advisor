// -----------------------------------------------------------------------------------------------
// ----LECTURA DEL BLOQUE PKT1: PROJECT-META DENTRO DEL README.md --------------------------------
// -----------------------------------------------------------------------------------------------

import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

//campos de project
export interface ProjectInfo {
    name: string; //nombre
    type: 'fullstack' | 'backend' | 'frontend' | 'heredado'; //valor que define el tipo de proyecto
    shape: 'fullstack' | 'backend' | 'frontend' | 'monolito-web';
    architecture_profile: string;
    status: string;
    repo_layout: 'monorepo' | 'single';
}

//elemento individual del stack
export interface StackItem {
    id: string;
    version?: string;
    source: 'declared' | 'inferred';
    note?: string;
}

//agrupa los StackItem por categoria 
export interface ProjectStack {
    languages: StackItem[];
    backend: StackItem[];
    frontend: StackItem[];
    database: StackItem[];
    testing: StackItem[];
    package_managers: StackItem[];
    runtime: StackItem[];
}

//objeto completo que se arma del bloque 
export interface ProjectMeta {
    pkt1_meta_version: number;
    kit_version: string;
    update: string;
    project: ProjectInfo;
    stack: ProjectStack;
}

export type AnalyzerScope = 'backend' | 'frontend' | 'shared'; //categorias de analizador que existen 

const BEGIN_PATTERN = /^[ \t]*<!--[ \t]*PKT1:PROJECT-META:BEGIN[ \t]*-->[ \t]*$/m;
const END_PATTERN = /^[ \t]*<!--[ \t]*PKT1:PROJECT-META:END[ \t]*-->[ \t]*$/m;
const YAML_FENCE_PATTERN = /```(?:yaml|yml)\s*\n([\s\S]*?)\n[ \t]*```/; //matchea un bloque de codigo markdown de tipo ```yaml ... ```

// funcion que saca el yaml que esta entre los marcadores BEGIN/END del readme 
function extractYamlBody(readmeText: string): string | null {
    const text = readmeText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'); //normaliza el texto

    const beginMatch =  BEGIN_PATTERN.exec(text); //busca el marcador BEGIN
    const endMatch = END_PATTERN.exec(text); //busca el marcador END
    //si falta uno regresa null
    if (!beginMatch || !endMatch || endMatch.index < beginMatch.index) {
        return null;
    }

    //si ambios existen y en orden correcto, recorta el texto que esta entre ellos
    const between = text.slice(beginMatch.index + beginMatch[0].length, endMatch.index);
    const fenceMatch = YAML_FENCE_PATTERN.exec(between); //le aplica YAML_FENCE_PATTERN para quedarse solo con lo que esta en ""
    return fenceMatch ? fenceMatch[1]: null; //si encuentra fence regresa null
}

//decide si un analizador debe de correr 
export function shouldRunAnalyzer(meta: ProjectMeta | null, scope: AnalyzerScope): boolean {
    if (scope === 'shared') { return true; } //si es shared siempre corre 
    const type = meta?.project.type;
    // sin bloque valido, o fullstack, o heredado corre todo
    if (!type || type === 'fullstack' || type === 'heredado') { return true; }
    return type === scope;
}

//lee el README.md que esta en la carpeta raiz, extrae el bloque y lo parsea
//si algo falla, osea si no hay readme, no hay bloque, regresa null
//y el flujo que llama decide que hacer 
export async function detectProjectMeta(workspaceRoot: vscode.Uri): Promise<ProjectMeta | null> {
    const readmeUri = vscode.Uri.joinPath(workspaceRoot, 'README.md'); //arma la ruta del readme 

    //intenta leerlo, si no existe regresa null
    let readmeText : string;
    try {
        const bytes = await vscode.workspace.fs.readFile(readmeUri);
        readmeText = Buffer.from(bytes).toString('utf8');
    } catch {
        return null;
    }

    //parsea el yaml 
    const yamlText = extractYamlBody(readmeText);
    if (!yamlText) { return null; }

    //si todo salio bien, castea el resultado y lo regresa 
    try {
        const parsed = yaml.load(yamlText);
        if (typeof parsed !== 'object' || parsed === null) { return null; }
        return parsed as ProjectMeta;
    } catch {
        return null;
    }
}
