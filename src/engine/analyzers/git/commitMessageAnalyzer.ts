// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DEL FORMATO DE LOS MENSAJES DE COMMIT: INICIALES Y DESCRIPCION ------
// ---------------------------------------------------------------------------------------

import { CommitInfo } from "../../shared/diffUtils";
import { CommitMessageConfig } from "../../config/configLoader";
import { Finding, pushFinding } from "../../shared/finding";

//funcion principal
//recibe commits: los commits del PR, findings: hallazgos
export function analyzeCommitMessages(commits: CommitInfo[], findings: Finding[], config: CommitMessageConfig): void {
    //el patron viene de code-advisor.config.json, si no es una expresion regular valida se avisa y no se revisa nada
    let pattern: RegExp;
    try {
        pattern = new RegExp(config.pattern);
    } catch {
        pushFinding(findings, 'commitMessage', 'Commits', 'El patron "' + config.pattern + '" de code-advisor.config.json no es una expresion regular valida', {
            suggestion: 'Corrige la expresion regular "pattern" en code-advisor.config.json.',
        });
        return;
    }

    //por cada commit del PR
    for (const commit of commits) {
        if (!pattern.test(commit.subject)) {
            pushFinding(findings, 'commitMessage', 'Commit ' + commit.hash, '"' + commit.subject + '" no sigue el formato INICIALES:Descripcion, ej. ABCD:Corrige validacion del login', {
                suggestion: 'Reescribe el mensaje del commit como "INICIALES:Descripcion" (ej. ABCD:Corrige validacion del login).',
            });
        }
    }
}
