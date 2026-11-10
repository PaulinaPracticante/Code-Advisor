// -------------------------------------------------------------------------------------------
// ---- LECTURA Y CACHEO DEL CLAUDE.md DE ESPECIFICAION POR PROYECTO -------------------------
// -------------------------------------------------------------------------------------------

import * as vscode from 'vscode';

const GUIDELINES_FILE_NAME = 'CLAUDE.md';

// cache en memoria: una entrada por cada workspace, se invalida si cambia la fecha de edicion del archivo
interface GuidelinesCacheEntry {
    mtime: number;
    content: string | null; // null = archivo vacio o solo con espacios (se trata como "sin guia")
}

const cache = new Map<string, GuidelinesCacheEntry>();

//lee el .md de guidelines configurado para el proyecto, si no esta configurado, no existe el archivo
// o no se puede lee, regresa null
export async function loadProjectGuidelines(workspaceRoot: vscode.Uri): Promise<string | null> {

    const uri =  vscode.Uri.joinPath(workspaceRoot, GUIDELINES_FILE_NAME);
    const cacheKey = uri.fsPath;

    try {
        const stat = await vscode.workspace.fs.stat(uri);
        const cached = cache.get(cacheKey);

        //si ya esta en cache y no cambio desde la ultima lectura, se reusa sin tocar el disco 
        if (cached && cached.mtime === stat.mtime) {
            return cached.content;
        }

        const bytes = await vscode.workspace.fs.readFile(uri);
        const raw = Buffer.from(bytes).toString('utf8');
        // un archivo vacio o solo con espacios no es una guia: mandarlo como system hace que la API responda 400
        const content = raw.trim() === '' ? null : raw;
        cache.set(cacheKey, { mtime: stat.mtime, content });
        return content;
    } catch {
        return null; //regresa null si no se puede leer 
    }
}