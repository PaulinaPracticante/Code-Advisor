// ---------------------------------------------------------------------------------------
// ---- VERIFICACION DEL FORMATO DE LOS MENSAJES DE COMMIT: INICIALES Y DESCRIPCION ------
// ---------------------------------------------------------------------------------------

import { CommitInfo } from "../../shared/diffUtils";
import { CommitMessageConfig } from "../../config/configLoader";

//funcion principal
//recibe commits: los commits del PR, findings: hallazgos
export function analyzeCommitMessages(commits: CommitInfo[], findings: string[], config: CommitMessageConfig): void {
    //el patron viene de code-advisor.config.json, si no es una expresion regular valida se avisa y no se revisa nada
    let pattern: RegExp;
    try {
        pattern = new RegExp(config.pattern);
    } catch {
        findings.push('Commits - El patron "' + config.pattern + '" de code-advisor.config.json no es una expresion regular valida');
        return;
    }

    //por cada commit del PR
    for (const commit of commits) {
        if (!pattern.test(commit.subject)) {
            findings.push('Commit ' + commit.hash + ' - "' + commit.subject + '" no sigue el formato INICIALES:Descripcion, ej. ABCD:Corrige validacion del login');
        }
    }
}
