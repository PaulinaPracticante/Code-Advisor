// ---------------------------------------------------------------------------------------------------------
// ---- DETECTA AUTOMATICAMENTE CUANDO EL USUARIO HACE UN COMMIT -------------------------------------------
// ---------------------------------------------------------------------------------------------------------

import * as vscode from 'vscode';
import { runCodeReview } from './commands/codeReviewerCommand';
import { FindingsPanel } from './findingsPanel';
import { error } from 'console';

//tipos minimos que describen la API interna de la extension oficial de Git de vscode
interface GitAPI {
    repositories: GitRepository[];
    onDidOpenRepository: vscode.Event<GitRepository>;
}

interface GitRepository {
    rootUri: vscode.Uri;
    state: {
        HEAD?: { commit?: string };
        onDidChange: vscode.Event<void>;
    };
}

//funcion principal
export function registerCommitWatcher(context: vscode.ExtensionContext, diagnosticCollection: vscode.DiagnosticCollection, findingsPanel: FindingsPanel): void {
    const gitExtension = vscode.extensions.getExtension('vscode.git'); //busca la extension vscode.git
    if (!gitExtension) {
        console.log('CodeAdvisor: no se encontro la extension vscode.git');
        return;
    }

    const git: GitAPI = gitExtension.exports.getAPI(1);
    console.log('CodeAdvisor: repos detectados al activar =', git.repositories.length);
    const lastKnownHead = new Map<string, string>(); //mapa para detectar cuando cambio realmente un commit 
    let reviewInProgress = false; //bandera para evitar correr dos analisis en paralelo

    const watchRepository = (repo: GitRepository) => {
        const key = repo.rootUri.toString();
        lastKnownHead.set(key, repo.state.HEAD?.commit ?? ''); //guarda el HEAD inicial del repo en lastKnowHead
        console.log('CodeAdvisor: escuchando cambios en', key, 'HEAD inicial =', repo.state.HEAD?.commit); 

        //se activa cada vez que cambia cualquier estado del repo
        repo.state.onDidChange(async () => {
            const currentHead = repo.state.HEAD?.commit;
            const previousHead = lastKnownHead.get(key); 
            console.log('CodeAdvisor: onDidChange, HEAD actual =', currentHead, 'anterior =', previousHead);

            //compara el HEAD actual contra el anterior guardado
            if (!currentHead || currentHead === previousHead) { return; }
            lastKnownHead.set(key, currentHead); //se actualiza lastKnownHead con el nuedo HEAD

            //si hay un analisis corriendo ignora este disparo
            if (reviewInProgress) {
                console.log('CodeAdvisor: ya hay un analisis corriendo, se ignora este cambio');
                return;
            }
            const folder = vscode.workspace.getWorkspaceFolder(repo.rootUri);
            if (!folder) {
                console.log('CodeAdvisor: no encontre workspace folder para', key);
                return;
            }

            reviewInProgress = true;
            try {
                await runCodeReview(folder, diagnosticCollection, findingsPanel);
            } catch (error) {
                console.error('CodeAdvisor: fallo el analisis automatico', error);
            } finally {
                reviewInProgress = false;
            }
        }, null, context.subscriptions);
    };


    git.repositories.forEach(watchRepository);
    git.onDidOpenRepository(watchRepository, null, context.subscriptions);
}