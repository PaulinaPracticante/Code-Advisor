import * as vscode from 'vscode';
import { EXTENSION_TO_LANGUAGE_ID } from './namingConfig';
import { analyzeNaming } from './namingAnalyzer';
import { analyzeIndentation } from './indentationAnalyzer';
import { analyzeEnvVariables } from './envAnalyzer';
import { analyzeIfStatements } from './ifAnalyzer';
import { analyzeParameters } from './parameterAnalyzer';
import { analyzeRequestModels } from './requestModelAnalyzer';
import { analyzeDtoAutoMapper } from './dtoAutoMapperAnalyzer';
import { analyzeLinqUsage } from './linqAnalyzer';
import { analyzeAsyncUsage } from './asyncAnalyzer';

// Registra el comando que revisa el codigo de todo el proyecto (workspace)
export function registerCodeReviewerCommand(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand('codeadvisor.codeReviewer', async () => {

		const folder = vscode.workspace.workspaceFolders?.[0]; // Se checa si hay una carpeta abierta en el workspace

		if (!folder) { //Si no hay una carpeta abierta, se muestra un mensaje de error
			vscode.window.showErrorMessage('Abra una carpeta que sea un repositorio de git primero');
			return;
		}

		const findings: string[] = []; // Aqui se van juntando los hallazgos de todos los archivos del proyecto

		// Se ignoran las carpetas de dependencias y de salida para no revisar codigo generado/de terceros
		const excludePattern = '{**/node_modules/**,**/dist/**,**/out/**,**/.git/**,**/build/**}';

		// Se buscan los archivos de codigo soportados y los archivos .env del workspace
		const codeFiles = await vscode.workspace.findFiles('**/*.{ts,tsx,js,jsx,php,cs}', excludePattern);
		const envFiles = await vscode.workspace.findFiles('**/.env*', excludePattern);

		// --------------------------------------------------------------------------------------
		// ---- IDENTACION Y NOMBRES DE CLASES, FUNCIONES, METODOS, VARIABLES Y CONSTANTES ------
		// ---- PARAMETROS ----------------------------------------------------------------------

		for (const uri of codeFiles) {
			const fileLabel = vscode.workspace.asRelativePath(uri); // Ruta relativa del archivo, para identificarlo en el reporte
			const bytes = await vscode.workspace.fs.readFile(uri); // Se lee el contenido del archivo
			const lines = Buffer.from(bytes).toString('utf8').split('\n'); // Se divide el texto del documento en lineas

			analyzeIndentation(lines, fileLabel, findings);
			analyzeIfStatements(lines, fileLabel, findings);
			analyzeParameters(lines, fileLabel, findings);
			analyzeRequestModels(lines, fileLabel, findings);
			analyzeDtoAutoMapper(lines, fileLabel, findings);
			analyzeLinqUsage(lines, fileLabel, findings);
			analyzeAsyncUsage(lines, fileLabel, findings);

			const extension = fileLabel.split('.').pop() ?? '';
			const languageId = EXTENSION_TO_LANGUAGE_ID[extension]; // Se obtiene el languageId a partir de la extension del archivo
			if (languageId) {
				analyzeNaming(lines, languageId, fileLabel, findings);
			}
		}

		// --------------------------------------------------------------------------------------
		// ---- VARIABLES DE ENTORNO ------------------------------------------------------------

		for (const uri of envFiles) {
			const fileLabel = vscode.workspace.asRelativePath(uri);
			const bytes = await vscode.workspace.fs.readFile(uri);
			const lines = Buffer.from(bytes).toString('utf8').split('\n');

			analyzeEnvVariables(lines, fileLabel, findings);
		}

		// --------------------------------------------------------------------------------------
		// ---- REPORTE ---------------------------------------------------------------------------

		// Se junta todo en un archivo de texto en la raiz del workspace y se abre para revisarlo
		const reportContent = findings.length > 0 ? findings.join('\n') : 'No se encontraron hallazgos.';
		const reportUri = vscode.Uri.joinPath(folder.uri, 'code-advisor-report.txt');
		await vscode.workspace.fs.writeFile(reportUri, Buffer.from(reportContent, 'utf8'));

		const reportDocument = await vscode.workspace.openTextDocument(reportUri);
		await vscode.window.showTextDocument(reportDocument);
	});

	context.subscriptions.push(disposable);
}
