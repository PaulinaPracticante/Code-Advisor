// ----------------------------------------------------------------------------------------------------
// ---- DATOS DE GIT QUE ACOMPAÑAN A CADA ANALISIS: REPO Y COMMIT -------------------------------------
// ----------------------------------------------------------------------------------------------------

import { execFileSync } from 'child_process';
import type { HistoryRepo } from './historyTypes';

//deja la direccion del repo igual sin importar como se clono (https o ssh), sin usuario ni contrasena ni ".git"
//ej. git@github.com:Org/Repo.git y https://usuario:token@github.com/Org/Repo.git -> https://github.com/Org/Repo
export function normalizeRemoteUrl(rawUrl: string): string {
    const raw = rawUrl.trim();

    //ruta de una carpeta (el repo se clono desde otra carpeta): no es una direccion de red, solo se normalizan las diagonales
    if (/^([A-Za-z]:[\\/]|\/|file:)/.test(raw)) {
        return raw.replace(/\\/g, '/').replace(/\.git$/, '');
    }

    //forma corta de ssh: usuario@servidor:ruta
    const scpLike = raw.match(/^[\w.-]+@([\w.-]+):(.+)$/);
    if (scpLike) {
        return 'https://' + scpLike[1].toLowerCase() + '/' + scpLike[2].replace(/\.git$/, '').replace(/^\/+/, '');
    }

    try {
        const url = new URL(raw);
        const port = url.port !== '' && !['22', '80', '443'].includes(url.port) ? ':' + url.port : '';
        return 'https://' + url.hostname.toLowerCase() + port + url.pathname.replace(/\.git$/, '').replace(/\/+$/, '');
    } catch {
        return raw.replace(/\.git$/, '');
    }
}

//nombre y direccion del repo a partir de su origin, regresa undefined si el repo no tiene origin
export function getRepoInfo(workspaceRoot: string, fallbackName: string): HistoryRepo | undefined {
    let remote: string;
    try {
        remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: workspaceRoot, encoding: 'utf8' }).trim();
    } catch {
        return undefined;
    }
    if (remote === '') { return undefined; }

    const remoteUrl = normalizeRemoteUrl(remote);
    const lastSegment = remoteUrl.split('/').filter(part => part !== '').pop();
    return { name: lastSegment && lastSegment !== '' ? lastSegment : fallbackName, remoteUrl };
}

//mensaje y autor de un commit
export function getCommitInfo(workspaceRoot: string, commit: string): { subject: string; authorName: string; authorEmail: string } {
    try {
        const output = execFileSync('git', ['log', '-1', '--format=%an%x09%ae%x09%s', commit], { cwd: workspaceRoot, encoding: 'utf8' });
        const [authorName, authorEmail, ...subject] = output.replace(/\r?\n$/, '').split('\t');
        return { subject: subject.join('\t'), authorName: authorName ?? '', authorEmail: authorEmail ?? '' };
    } catch {
        return { subject: '', authorName: '', authorEmail: '' };
    }
}
