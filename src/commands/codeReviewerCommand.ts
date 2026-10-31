import * as vscode from 'vscode';
import { execFileSync } from 'child_process';
import { loadConfig, buildExcludeMatchers, isExluded } from '../config/configLoader';
import { getChangedLineNumbers } from '../shared/diffUtils';
import { EXTENSION_TO_LANGUAGE_ID } from '../config/namingConfig';
import { analyzeNaming } from '../analyzers/style/namingAnalyzer';
import { analyzeIndentation } from '../analyzers/style/indentationAnalyzer';
import { analyzeEnvVariables } from '../analyzers/env/envAnalyzer';
import { analyzeIfStatements } from '../analyzers/style/ifAnalyzer';
import { analyzeParameters } from '../analyzers/style/parameterAnalyzer';
import { analyzeRequestModels } from '../analyzers/structure/requestModelAnalyzer';
import { analyzeDtoAutoMapper } from '../analyzers/structure/dtoAutoMapperAnalyzer';
import { analyzeLinqUsage } from '../analyzers/structure/linqAnalyzer';
import { analyzeAsyncUsage } from '../analyzers/structure/asyncAnalyzer';
import { analyzeVarUsage } from '../analyzers/style/varAnalyze';
import { analyzeObjectUsage } from '../analyzers/structure/objectAnalyzer';
import { analyzeStringInterpolation } from '../analyzers/style/stringInterpolationAnalyzer';
import { analyzeExceptionHandling } from '../analyzers/structure/exceptionHandlingAnalyzer';
import { analyzeInterfaceContracts } from '../analyzers/structure/interfaceContractAnalyzer';
import { analyzeLayeredStructure } from '../analyzers/structure/layeredStructureAnalyzer';
import { Minimatch } from 'minimatch';
import { analyzeDuplicateCode } from '../analyzers/structure/duplicateCodeAnalyzer';
import { analyzeFileNaming } from '../analyzers/style/fileNamingAnalyzer';
import { analyzeCssClassNaming } from '../analyzers/style/cssClassNamingAnalyzer';
import { analyzeRequestHandlers } from '../analyzers/structure/requestHandlerAnalyzer';
import { analyzeComponentLocation } from '../analyzers/structure/componentLocationAnalyzer';
import { analyzeFolderStructure } from '../analyzers/structure/folderNamingAnalyzer';
import { detectProjectMeta, shouldRunAnalyzer } from '../shared/projectProfile';
import { analyzeEnglishLanguage } from '../analyzers/ai/englishLanguageAnalyzer';
import { analyzeSemanticNaming } from '../analyzers/ai/semanticNamingAnalyzer';

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

		const config = await loadConfig(folder.uri);
		const projectMeta  = await detectProjectMeta(folder.uri);
		const excludeMatchers = buildExcludeMatchers(config);

		const findings: string[] = []; // Aqui se van juntando los hallazgos de todos los archivos del proyecto

		// Se ignoran las carpetas de dependencias y de salida para no revisar codigo generado/de terceros
		const excludePattern = `{${config.exclude.join(',')}}`;

		const baseBranch = vscode.workspace.getConfiguration('codeadvisor').get<string>('baseBranch', 'main');
		const changedPaths = getChangedFile(folder.uri.fsPath, baseBranch);

		const codeFiles = changedPaths
			.filter(path => /\.(ts|tsx|js|jsx|php|cs)$/.test(path))
			.filter(path => !isExluded(path, excludeMatchers))
			.map(path => vscode.Uri.joinPath(folder.uri, path));

		const envFiles = changedPaths
			.filter(path => /(^|\/)\.env/.test(path))
			.filter (path => !isExluded(path, excludeMatchers))
			.map(path => vscode.Uri.joinPath(folder.uri, path));

		const htmlCssFiles = changedPaths
			.filter(path => /\.(html|css|jsx|tsx)$/.test(path))
			.filter(path => !isExluded(path, excludeMatchers))
			.map(path => vscode.Uri.joinPath(folder.uri, path));

		// Se guardan las lineas de cada archivo para los analisis que necesitan ver todo el proyecto a la vez
		const fileLines = new Map<string, string[]>();
		const changedLinesByFile = new Map<string, Set<number>>();

		// --------------------------------------------------------------------------------------
		// ---- IDENTACION Y NOMBRES DE CLASES, FUNCIONES, METODOS, VARIABLES Y CONSTANTES ------
		// ---- PARAMETROS ----------------------------------------------------------------------

		for (const uri of codeFiles) {
			const fileLabel = vscode.workspace.asRelativePath(uri); // Ruta relativa del archivo, para identificarlo en el reporte
			const bytes = await vscode.workspace.fs.readFile(uri); // Se lee el contenido del archivo
			const lines = Buffer.from(bytes).toString('utf8').split('\n'); // Se divide el texto del documento en lineas
			const changedLines = getChangedLineNumbers(folder.uri.fsPath, baseBranch, fileLabel);
			fileLines.set(fileLabel, lines);
			changedLinesByFile.set(fileLabel, changedLines);

			if (config.rules.parameters.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
				analyzeParameters(lines, fileLabel, findings, changedLines, config.rules.parameters);
			}

			if (config.rules.requestModels.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
				analyzeRequestModels(lines, fileLabel, findings, changedLines, config.rules.requestModels);
			}

			if (config.rules.dtoAutoMapper.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
				analyzeDtoAutoMapper(lines, fileLabel, findings, changedLines, config.rules.dtoAutoMapper);
			}

			if (config.rules.linq.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
				analyzeLinqUsage(lines, fileLabel, findings, changedLines, config.rules.linq);
			}

			if (config.rules.objectUsage.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
				analyzeObjectUsage(lines, fileLabel, findings, changedLines, config.rules.objectUsage);
			}

			if (config.rules.requestHandlers.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
				analyzeRequestHandlers(lines, fileLabel, findings, changedLines, config.rules.requestHandlers);
			}

			if (config.rules.englishOnly.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
				await analyzeEnglishLanguage(lines, fileLabel, findings, changedLines, config.rules.englishOnly);
			}

			if (config.rules.semanticNaming.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
				await analyzeSemanticNaming(lines, fileLabel, findings, changedLines, config.rules.semanticNaming);
			}

			if (config.rules.indentation.enabled) { analyzeIndentation(lines, fileLabel, findings, changedLines); }
			if (config.rules.ifBraces.enabled && shouldRunAnalyzer(projectMeta, 'shared')) { analyzeIfStatements(lines, fileLabel, findings, changedLines); }
			if (config.rules.async.enabled && shouldRunAnalyzer(projectMeta, 'backend')) { analyzeAsyncUsage(lines, fileLabel, findings, changedLines); }
			if (config.rules.varUsage.enabled && shouldRunAnalyzer(projectMeta, 'backend')) { analyzeVarUsage(lines, fileLabel, findings, changedLines); }
			if (config.rules.stringInterpolation.enabled && shouldRunAnalyzer(projectMeta, 'backend')) { analyzeStringInterpolation(lines, fileLabel, findings, changedLines); }
			if (config.rules.exceptionHandling.enabled && shouldRunAnalyzer(projectMeta, 'backend')) { analyzeExceptionHandling(lines, fileLabel, findings, changedLines); }

			const extension = fileLabel.split('.').pop() ?? '';
			const languageId = EXTENSION_TO_LANGUAGE_ID[extension]; // Se obtiene el languageId a partir de la extension del archivo
			if (languageId) {
				analyzeNaming(lines, languageId, fileLabel, findings);
			}

			if (config.rules.fileNaming.enabled && shouldRunAnalyzer(projectMeta, 'frontend')) {
				analyzeFileNaming(lines, fileLabel, findings, folder.name);
			}

			if (config.rules.componentLocation.enabled && shouldRunAnalyzer(projectMeta, 'frontend')) {
				analyzeComponentLocation(lines, fileLabel, findings, config.rules.componentLocation);
			}

		}

		// --------------------------------------------------------------------------------------
		// ---- CONTRATOS: INTERFACES Y CLASES ABSTRACTAS ---------------------------------------
		// Se ejecuta despues del ciclo porque una interfaz puede estar en un archivo y su implementacion en otro

		const folderPaths = await collectFolderPaths(folder.uri, excludeMatchers);

		if (shouldRunAnalyzer(projectMeta, 'frontend')) {
			analyzeFolderStructure(folderPaths, folder.name, findings);
		}

		if (config.rules.interfaces.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			await analyzeInterfaceContracts(fileLines, folder.uri, excludePattern, findings, config.rules.interfaces);
		}
		if (config.rules.layers.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			analyzeLayeredStructure(fileLines, folderPaths, findings, config.rules.layers);
		}
		if (config.rules.duplicateCode.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			analyzeDuplicateCode(fileLines, changedLinesByFile, findings, config.rules.duplicateCode);
		}

		// --------------------------------------------------------------------------------------
		// ---- VARIABLES DE ENTORNO------------------------------------------------------------

		for (const uri of envFiles) {
			const fileLabel = vscode.workspace.asRelativePath(uri);
			const bytes = await vscode.workspace.fs.readFile(uri);
			const lines = Buffer.from(bytes).toString('utf8').split('\n');

			if(config.rules.envNaming.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
				analyzeEnvVariables(lines, fileLabel, findings);
			}
		}

		//----------------------------------------------------------------------------------------
		// ---- CLASES EN HTML/CSS ---------------------------------------------------------------

		for (const uri of htmlCssFiles) {
			const fileLabel = vscode.workspace.asRelativePath(uri);
			const bytes =  await vscode.workspace.fs.readFile(uri);
			const lines = Buffer.from(bytes).toString('utf8').split('\n');
			const extension = fileLabel.split('.').pop();
			const classLenguage = extension === 'css' ? 'css' : 'html'; 

			if (config.rules.cssClassNaming.enabled && (extension === 'html' || extension === 'css' || extension === 'jsx' || extension === 'tsx') && shouldRunAnalyzer(projectMeta, 'frontend')) {
				analyzeCssClassNaming(lines, classLenguage, fileLabel, findings);
			}
		}

		// ----------------------------------------------------------------------------------------
		// ---- CARPETAS --------------------------------------------------------------------------
		async function collectFolderPaths(uri: vscode.Uri, excludedNames: Minimatch[]): Promise<string[]> {
			const folderPaths: string[] = [];
			const entries = await vscode.workspace.fs.readDirectory(uri);

			for (const [name, type] of entries) {

				if (type === vscode.FileType.Directory) {
					const childUri = vscode.Uri.joinPath(uri, name);
					const relativePath = vscode.workspace.asRelativePath(childUri);
					if (isExluded(relativePath + '/', excludeMatchers)) { continue; }
					folderPaths.push(relativePath);
					const nested = await collectFolderPaths(childUri, excludeMatchers);
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
