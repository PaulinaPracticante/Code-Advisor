import * as vscode from 'vscode';
import { execFileSync } from 'child_process';
import { getChangedLineNumbers } from './diffUtils';
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
import { analyzeVarUsage } from './varAnalyze';
import { analyzeObjectUsage } from './objectAnalyzer';
import { analyzeStringInterpolation } from './stringInterpolationAnalyzer';
import { analyzeExceptionHandling } from './exceptionHandlingAnalyzer';
import { analyzeInterfaceContracts } from './interfaceContractAnalyzer';
import { analyzeLayeredStructure } from './layeredStructureAnalyzer';

function getChangedFile(workspaceRoot: string, baseBranch: string): string[] { 
	try {

		execFileSync('git', ['fetch', 'origin', baseBranch], { cwd: workspaceRoot, encoding: 'utf8' });
		
		const output = execFileSync(
			'git',
			['diff', '--name-only', '--diff-filter=ACMR', `origin/${baseBranch}...HEAD`],
			{ cwd: workspaceRoot, encoding: 'utf8' }
		);

		return output
			.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0);

	} catch (error) {
		throw new Error(`No se pudo obtener el diff contra la rama "origin/${baseBranch}": ${(error as Error).message}`);
	}
}

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

		const baseBranch = vscode.workspace.getConfiguration('codeadvisor').get<string>('baseBranch', 'main');
		const changedPaths = getChangedFile(folder.uri.fsPath, baseBranch);

		const codeFiles = changedPaths
			.filter(path => /\.(ts|tsx|js|jsx|php|cs)$/.test(path))
			.map(path => vscode.Uri.joinPath(folder.uri, path));

		const envFiles = changedPaths
			.filter(path => /(^|\/)\.env/.test(path))
			.map(path => vscode.Uri.joinPath(folder.uri, path));

		// Se guardan las lineas de cada archivo para los analisis que necesitan ver todo el proyecto a la vez
		const fileLines = new Map<string, string[]>();

		// --------------------------------------------------------------------------------------
		// ---- IDENTACION Y NOMBRES DE CLASES, FUNCIONES, METODOS, VARIABLES Y CONSTANTES ------
		// ---- PARAMETROS ----------------------------------------------------------------------

		for (const uri of codeFiles) {
			const fileLabel = vscode.workspace.asRelativePath(uri); // Ruta relativa del archivo, para identificarlo en el reporte
			const bytes = await vscode.workspace.fs.readFile(uri); // Se lee el contenido del archivo
			const lines = Buffer.from(bytes).toString('utf8').split('\n'); // Se divide el texto del documento en lineas
			const changedLines = getChangedLineNumbers(folder.uri.fsPath, baseBranch, fileLabel);
			fileLines.set(fileLabel, lines);

			analyzeIndentation(lines, fileLabel, findings, changedLines);
			analyzeIfStatements(lines, fileLabel, findings, changedLines);
			analyzeParameters(lines, fileLabel, findings, changedLines);
			analyzeRequestModels(lines, fileLabel, findings, changedLines);
			analyzeDtoAutoMapper(lines, fileLabel, findings, changedLines);
			analyzeLinqUsage(lines, fileLabel, findings, changedLines);
			analyzeAsyncUsage(lines, fileLabel, findings, changedLines);
			analyzeVarUsage(lines, fileLabel, findings, changedLines);
			analyzeObjectUsage(lines, fileLabel, findings, changedLines);
			analyzeStringInterpolation(lines, fileLabel, findings, changedLines);
			analyzeExceptionHandling(lines, fileLabel, findings, changedLines);

			const extension = fileLabel.split('.').pop() ?? '';
			const languageId = EXTENSION_TO_LANGUAGE_ID[extension]; // Se obtiene el languageId a partir de la extension del archivo
			if (languageId) {
				analyzeNaming(lines, languageId, fileLabel, findings);
			}
		}

		// --------------------------------------------------------------------------------------
		// ---- CONTRATOS: INTERFACES Y CLASES ABSTRACTAS ---------------------------------------
		// Se ejecuta despues del ciclo porque una interfaz puede estar en un archivo y su implementacion en otro

		const excludedFolderNames = new Set (['node_module', 'dist', 'out', '.git', 'build']);
		const folderPaths = await collectFolderPaths(folder.uri, excludedFolderNames);

		await analyzeInterfaceContracts(fileLines, folder.uri, excludePattern, findings);
		analyzeLayeredStructure(fileLines, folderPaths, findings);

		// --------------------------------------------------------------------------------------
		// ---- VARIABLES DE ENTORNO------------------------------------------------------------

		for (const uri of envFiles) {
			const fileLabel = vscode.workspace.asRelativePath(uri);
			const bytes = await vscode.workspace.fs.readFile(uri);
			const lines = Buffer.from(bytes).toString('utf8').split('\n');

			analyzeEnvVariables(lines, fileLabel, findings);
		}

		// ----------------------------------------------------------------------------------------
		// ---- CARPETAS --------------------------------------------------------------------------
		async function collectFolderPaths(uri: vscode.Uri, excludedNames: Set<string>): Promise<string[]> {
			const folderPaths: string[] = [];
			const entries = await vscode.workspace.fs.readDirectory(uri);

			for (const [name, type] of entries) {
				if (excludedNames.has(name)) {
					continue;
				}

				if (type === vscode.FileType.Directory) {
					const childUri = vscode.Uri.joinPath(uri, name);
					folderPaths.push(vscode.workspace.asRelativePath(childUri));
					const nested = await collectFolderPaths(childUri, excludedNames);
					folderPaths.push(...nested);
				}
			}
			return folderPaths;
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
