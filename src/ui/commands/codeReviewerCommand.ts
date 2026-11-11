import * as vscode from 'vscode';
import { execFileSync } from 'child_process';
import { loadConfig, buildExcludeMatchers, isExluded, CodeAdvisorConfig } from '../../engine/config/configLoader';
import { getChangedLineNumbers, getCommitSubjects } from '../../engine/shared/diffUtils';
import { EXTENSION_TO_LANGUAGE_ID, getNamingCaseStyles } from '../../engine/config/namingConfig';
import { analyzeNaming } from '../../engine/analyzers/style/namingAnalyzer';
import { analyzeIndentation } from '../../engine/analyzers/style/indentationAnalyzer';
import { analyzeEnvVariables } from '../../engine/analyzers/env/envAnalyzer';
import { analyzeIfStatements } from '../../engine/analyzers/style/ifAnalyzer';
import { analyzeParameters } from '../../engine/analyzers/style/parameterAnalyzer';
import { analyzeRequestModels } from '../../engine/analyzers/structure/requestModelAnalyzer';
import { analyzeDtoAutoMapper } from '../../engine/analyzers/structure/dtoAutoMapperAnalyzer';
import { analyzeLinqUsage } from '../../engine/analyzers/structure/linqAnalyzer';
import { analyzeAsyncUsage } from '../../engine/analyzers/structure/asyncAnalyzer';
import { analyzeVarUsage } from '../../engine/analyzers/style/varAnalyze';
import { analyzeObjectUsage } from '../../engine/analyzers/structure/objectAnalyzer';
import { analyzeStringInterpolation } from '../../engine/analyzers/style/stringInterpolationAnalyzer';
import { analyzeExceptionHandling } from '../../engine/analyzers/structure/exceptionHandlingAnalyzer';
import { analyzeInterfaceContracts } from '../../engine/analyzers/structure/interfaceContractAnalyzer';
import { analyzeLayeredStructure } from '../../engine/analyzers/structure/layeredStructureAnalyzer';
import { Minimatch } from 'minimatch';
import { analyzeDuplicateCode } from '../../engine/analyzers/structure/duplicateCodeAnalyzer';
import { analyzeFileNaming } from '../../engine/analyzers/style/fileNamingAnalyzer';
import { analyzeCssClassNaming } from '../../engine/analyzers/style/cssClassNamingAnalyzer';
import { analyzeRequestHandlers } from '../../engine/analyzers/structure/requestHandlerAnalyzer';
import { analyzeComponentLocation } from '../../engine/analyzers/structure/componentLocationAnalyzer';
import { analyzeFolderStructure } from '../../engine/analyzers/structure/folderNamingAnalyzer';
import { detectProjectMeta, shouldRunAnalyzer, ProjectMeta } from '../../engine/shared/projectProfile';
import { analyzeQueryViews } from '../../engine/analyzers/structure/queryViewAnalyzer';
import { analyzeTableAliases } from '../../engine/analyzers/structure/tableAliasAnalyzer';
import { analyzeTransactions } from '../../engine/analyzers/structure/transactionAnalyzer';
import { analyzeCommitMessages } from '../../engine/analyzers/git/commitMessageAnalyzer';
import { collectChangesFunction, findEnclosingClassName } from '../../engine/shared/functionExtraction';
import { extractComments } from '../../engine/shared/commentExtraction';
import { AiCommentTask, AiFunctionTask, MIN_FUNCTION_LINES, runCombinedAiReview } from '../../engine/analyzers/ai/combinedAiAnalyzer';
import { analyzeSolidFrontendIsp } from '../../engine/analyzers/structure/solidFrontendAnalyzer';
import { collectSolidFrontendTask, runSolidFrontendReview, SolidFrontendTask } from '../../engine/analyzers/ai/solidFrontendAnalyzer';
import { loadProjectGuidelines } from '../../engine/shared/projectGuidelines';
import { Finding } from '../../engine/shared/finding';
import { publishDiagnostics } from '../diagnostics';
import { updateDecorations } from '../decorations';
import { FindingsPanel } from '../findingsPanel';

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

function getCurrentCommit(workspaceRoot: string): string {
	return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspaceRoot, encoding: 'utf8' }).trim();
}

// corre sobre un solo archivo todas las reglas estaticas (sin IA, sin analizadores de todo el proyecto);
// se usa tanto en el analisis completo como en el re-chequeo al guardar (ver saveWatcher.ts)
export function analyzeFileStatic(
	lines: string[],
	fileLabel: string,
	folderName: string,
	changedLines: Set<number>,
	config: CodeAdvisorConfig,
	projectMeta: ProjectMeta | null,
	findings: Finding[]
): void {
	if (config.rules.parameters.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			analyzeParameters(lines, fileLabel, findings, changedLines, config.rules.parameters)
	}

	if (config.rules.requestModels.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			analyzeRequestModels(lines, fileLabel, findings, changedLines, config.rules.requestModels)
	}

	if (config.rules.dtoAutoMapper.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			analyzeDtoAutoMapper(lines, fileLabel, findings, changedLines, config.rules.dtoAutoMapper)
	}

	if (config.rules.linq.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			analyzeLinqUsage(lines, fileLabel, findings, changedLines, config.rules.linq)
	}

	if (config.rules.objectUsage.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			analyzeObjectUsage(lines, fileLabel, findings, changedLines, config.rules.objectUsage)
	}

	if (config.rules.requestHandlers.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			analyzeRequestHandlers(lines, fileLabel, findings, changedLines, config.rules.requestHandlers)
	}

	if (config.rules.solidFrontend.enabled && shouldRunAnalyzer(projectMeta, 'frontend')) {
			analyzeSolidFrontendIsp(lines, fileLabel, findings, config.rules.solidFrontend)
	}

	if (config.rules.queryViews.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			analyzeQueryViews(lines, fileLabel, findings, changedLines, config.rules.queryViews)
	}

	if (config.rules.tableAlias.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			analyzeTableAliases(lines, fileLabel, findings, changedLines)
	}

	if (config.rules.transactions.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
			analyzeTransactions(lines, fileLabel, findings, changedLines)
	}

	if (config.rules.indentation.enabled) {
			analyzeIndentation(lines, fileLabel, findings, changedLines)
	}
	if (config.rules.ifBraces.enabled && shouldRunAnalyzer(projectMeta, 'shared')) {
			analyzeIfStatements(lines, fileLabel, findings, changedLines, config.rules.ternaries.enabled)
	}
	if (config.rules.async.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
		analyzeAsyncUsage(lines, fileLabel, findings, changedLines);
	}
	if (config.rules.varUsage.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
		analyzeVarUsage(lines, fileLabel, findings, changedLines);
	}
	if (config.rules.stringInterpolation.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
		analyzeStringInterpolation(lines, fileLabel, findings, changedLines);
	}
	if (config.rules.exceptionHandling.enabled && shouldRunAnalyzer(projectMeta, 'backend')) {
		analyzeExceptionHandling(lines, fileLabel, findings, changedLines);
	}

	const extension = fileLabel.split('.').pop() ?? '';
	const languageId = EXTENSION_TO_LANGUAGE_ID[extension]; // Se obtiene el languageId a partir de la extension del archivo
	if (languageId && config.rules.naming.enabled) {
		analyzeNaming(lines, languageId, fileLabel, findings, getNamingCaseStyles(config.rules.naming, languageId))
	}

	if (config.rules.fileNaming.enabled && shouldRunAnalyzer(projectMeta, 'frontend')) {
		analyzeFileNaming(lines, fileLabel, findings, folderName)
	}

	if (config.rules.componentLocation.enabled && shouldRunAnalyzer(projectMeta, 'frontend')) {
		analyzeComponentLocation(lines, fileLabel, findings, config.rules.componentLocation)
	}
}

export async function runCodeReview(folder: vscode.WorkspaceFolder, diagnosticCollection: vscode.DiagnosticCollection, findingsPanel: FindingsPanel): Promise<void> {


		if (!folder) { //Si no hay una carpeta abierta, se muestra un mensaje de error
			vscode.window.showErrorMessage('Abra una carpeta que sea un repositorio de git primero');
			return;
		}

		const commit = getCurrentCommit(folder.uri.fsPath);
		const cachedFindings = findingsPanel.getCachedFindings(folder, commit);
		if (cachedFindings) {
			publishDiagnostics(diagnosticCollection, folder, cachedFindings);
			updateDecorations(cachedFindings);
			vscode.window.showInformationMessage(
				'CodeAdvisor: este commit ya fue analizado, se muestran los hallazgos guardados'
			);
			return;
		}

		const config = await loadConfig(folder.uri);
		const projectMeta  = await detectProjectMeta(folder.uri);
		const guidelines = await loadProjectGuidelines(folder.uri);
		const excludeMatchers = buildExcludeMatchers(config);

		const findings: Finding[] = []; // Aqui se van juntando los hallazgos de todos los archivos del proyecto

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


		const aiFunctionTasks: AiFunctionTask[] = [];
		const aiCommentTasks: AiCommentTask[] = [];
		const solidFrontendTasks: SolidFrontendTask[] = [];
		let aiFunctionIdCounter = 0;
		let aiCommentIdCounter = 0;
		let solidFrontendIdCounter = 0;
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

			analyzeFileStatic(lines, fileLabel, folder.name, changedLines, config, projectMeta, findings);

			if (config.rules.solidFrontendAi.enabled && shouldRunAnalyzer(projectMeta, 'frontend')) {
				const task = collectSolidFrontendTask(lines, fileLabel, changedLines, 'comp' + (solidFrontendIdCounter++));
				if (task) { solidFrontendTasks.push(task); }
			}

			const englishEnabled = config.rules.englishOnly.enabled && shouldRunAnalyzer(projectMeta, 'shared');
			const semanticEnabled = config.rules.semanticNaming.enabled && shouldRunAnalyzer(projectMeta, 'shared');
			const responsabilityEnabled = config.rules.singleResponsibility.enabled && shouldRunAnalyzer(projectMeta, 'backend');
			const complexityEnabled = config.rules.codeComplexity.enabled && shouldRunAnalyzer(projectMeta, 'backend');
			
			if (englishEnabled || semanticEnabled || responsabilityEnabled || complexityEnabled) {
				for (const block of collectChangesFunction(lines, changedLines)) {
					const longEnough = block.endLine - block.startLine + 1 >= MIN_FUNCTION_LINES;
					const guidelinesEnabled = guidelines !== null;
					const checks = {
						english: englishEnabled,
						semantic: semanticEnabled,
						singleResponsability: responsabilityEnabled && longEnough,
						complexity: complexityEnabled && longEnough,
						guidelines: guidelinesEnabled,
					};

					if (!checks.english && !checks.semantic && !checks.singleResponsability && !checks.complexity) { continue; }

					aiFunctionTasks.push({
						id: 'fn' + (aiFunctionIdCounter++),
						fileLabel,
						functionName: block.name,
						className: findEnclosingClassName(lines, block.startLine - 1),
						startLine: block.startLine,
						code: block.code,
						checks,
					});
				}
			}

			const commentEnabled = config.rules.commentLanguage.enabled
				&& shouldRunAnalyzer(projectMeta, 'frontend')
				&& !fileLabel.endsWith('.cs');

			if (commentEnabled) {
				for (const comment of extractComments(lines, changedLines)) {
					aiCommentTasks.push({
						id: 'cm' + (aiCommentIdCounter++),
						fileLabel,
						line: comment.line,
						text: comment.text,
					});
				}
			}

		}

		// -------------------------------------------------------------------------------------
		// ---- IA: UNA SOLA LLAMADA PARA TODO EL PR -------------------------------------------
				
		// runCombinedAiReview mezcla varias reglas (englishOnly, semanticNaming, singleResponsibility,
		// codeComplexity, commentLanguage) con distinta prioridad cada una; se etiquetan dentro del
		// propio analizador (ver CHECK_TO_RULE en combinedAiAnalyzer.ts), no se puede envolver aqui con una sola prioridad.
		await runCombinedAiReview(aiFunctionTasks, aiCommentTasks, findings, config.rules.aiReview, guidelines);
		await runSolidFrontendReview(solidFrontendTasks, findings, config.rules.solidFrontendAi);

		// --------------------------------------------------------------------------------------
		// ---- CONTRATOS: INTERFACES Y CLASES ABSTRACTAS ---------------------------------------
		// Se ejecuta despues del ciclo porque una interfaz puede estar en un archivo y su implementacion en otro

		const folderPaths = await collectFolderPaths(folder.uri, excludeMatchers);

		if (config.rules.folderNaming.enabled && shouldRunAnalyzer(projectMeta, 'frontend')) {
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
		// ---- COMMITS ---------------------------------------------------------------------------

		if (config.rules.commitMessage.enabled && shouldRunAnalyzer(projectMeta, 'shared')) {
			analyzeCommitMessages(getCommitSubjects(folder.uri.fsPath, baseBranch), findings, config.rules.commitMessage);
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
		function groupByPriority(findings: Finding[]): string {
			const order: Array<'Alta' | 'Media' | 'Baja'> = ['Alta', 'Media', 'Baja'];
			const groups: Record<string, Finding[]> = { 'Alta': [], 'Media': [], 'Baja': [] };

			for (const f of findings) {
				groups[f.severity].push(f);
			}

			const formatFinding = (f: Finding) =>
				`${f.file}${f.line !== undefined ? ':' + f.line : ''} - ${f.message}`;

			return order
				.filter(p => groups[p].length > 0)
				.map(p => `=== Prioridad ${p.toUpperCase()} (${groups[p].length}) ===\n${groups[p].map(formatFinding).join('\n')}`)
				.join('\n\n');
		}
		publishDiagnostics(diagnosticCollection, folder, findings);
		updateDecorations(findings);
		findingsPanel.update(folder, findings, commit);
		const reportContent = findings.length > 0 ? groupByPriority(findings) : 'No se encontraron hallazgos.';
		const reportUri = vscode.Uri.joinPath(folder.uri, 'code-advisor-report.txt');
		await vscode.workspace.fs.writeFile(reportUri, Buffer.from(reportContent, 'utf8'));

		const reportDocument = await vscode.workspace.openTextDocument(reportUri);
		await vscode.window.showTextDocument(reportDocument);
}


// Registra el comando que revisa el codigo de todo el proyecto (workspace)
export function registerCodeReviewerCommand(context: vscode.ExtensionContext, diagnosticCollection: vscode.DiagnosticCollection, findingsPanel: FindingsPanel): void {
	const disposable = vscode.commands.registerCommand('codeadvisor.codeReviewer', async () => {
		const folder = vscode.workspace.workspaceFolders?.[0];
		if (!folder) {
			vscode.window.showErrorMessage('Abra una carpeta que sea un repositorio de git primero');
			return;
		}
		await runCodeReview(folder, diagnosticCollection, findingsPanel);
	});

	context.subscriptions.push(disposable);
}
