// ----------------------------------------------------------------------------------------------------
// ---- ARMA LOS REGISTROS DEL HISTORIAL A PARTIR DE UNA REVISION Y LOS MANDA ------------------------
// ----------------------------------------------------------------------------------------------------

import type { Finding } from '../shared/finding';
import { getCommitInfo, getRepoInfo } from './gitInfo';
import { getHistory } from './historyClient';
import { buildHistoryFindings } from './historyTypes';

//guarda en el historial el analisis de un commit con los hallazgos que se estan mostrando, no bloquea ni lanza error
export function recordAnalysis(root: string, folderName: string, branch: string, commit: string, findings: Finding[]): void {
    const client = getHistory();
    if (!client || !client.isEnabled()) { return; }

    try {
        const repo = getRepoInfo(root, folderName);
        if (!repo) { return; } //sin origin no se sabe a que repo pertenece
        void client.recordAnalysis({
            repo,
            branch,
            commit: { hash: commit, ...getCommitInfo(root, commit) },
            analyzedAt: new Date().toISOString(),
            extensionVersion: client.extensionVersion,
            findings: buildHistoryFindings(findings),
        });
    } catch (error) {
        console.warn('CodeAdvisor: no se pudo armar el registro del historial', error);
    }
}

//avisos de merge ya mandados en esta sesion, para no repetirlos cada vez que se revisa el mismo commit despues del merge
//(si un aviso no pudo salir queda en la cola del cliente, no hace falta volver a armarlo)
const notifiedClosures = new Set<string>();

//avisa que el PR de una rama ya se mergeo (se detecta cuando el ultimo commit analizado ya esta en la rama base)
export function recordPullRequestMerged(root: string, folderName: string, branch: string, lastCommit: string): void {
    const client = getHistory();
    if (!client || !client.isEnabled()) { return; }

    try {
        const repo = getRepoInfo(root, folderName);
        if (!repo) { return; }

        const closureKey = repo.remoteUrl + '|' + branch + '|' + lastCommit;
        if (notifiedClosures.has(closureKey)) { return; }
        notifiedClosures.add(closureKey);

        void client.recordMerge({ repo, branch, lastCommit, mergedAt: new Date().toISOString() });
    } catch (error) {
        console.warn('CodeAdvisor: no se pudo armar el aviso de merge del historial', error);
    }
}
