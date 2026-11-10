import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { registerCodeReviewerCommand } from './ui/commands/codeReviewerCommand';
import { registerCommitWatcher } from './ui/commitWatcher';
import { publishDiagnostics } from './ui/diagnostics';
import { registerDecorationRefresh } from './ui/decorations';
import { FindingsPanel } from './ui/findingsPanel';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "codeadvisor" is now active!');

	// Carga la ANTHROPIC_API_KEY desde src/.env (archivo ignorado por git)
	dotenv.config({ path: path.join(context.extensionPath, 'src', '.env') });

	// comando para verificar el repo de git
	const disposable = vscode.commands.registerCommand('codeadvisor.gitVerification', () => {
		// Todo lo que pasa aqui se ejecutara cuando se ejecute el comando helloworld
		const folder = vscode.workspace.workspaceFolders?.[0]; // Se checa si hay una carpeta abierta en el workspace

		if (!folder) { //Si no hay una carpeta abierta, se muestra un mensaje de error
			vscode.window.showErrorMessage('Abra una carpeta que sea un repositorio de git primero');
		}

		const folderPath = folder?.uri.fsPath; //Se obtiene la ruta de la carpeta abierta en el workspace
		const git = vscode.extensions.getExtension('vscode.git')?.exports.getAPI(1); // Se obtiene la API de git de la extension de git de vscode
		const repo = folderPath ? git?.getRepository(vscode.Uri.file(folderPath)) : undefined;  // Se obtiene el repositorio de git de la carpeta abierta en el workspace

		if (!repo) { //Si no se encuenta un repositorio de git en esta carpeta, se muestra el mensaje de error
			vscode.window.showErrorMessage('No se pudo encontrar un repositorio de git en la carpeta abierta');
		}

	});

	const diagnosticCollection = vscode.languages.createDiagnosticCollection('codeadvisor');
	context.subscriptions.push(diagnosticCollection);

	const findingsPanel = new FindingsPanel();
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(FindingsPanel.viewType, findingsPanel)
	);

	// comando para revisar el codigo de todo el proyecto (workspace)
	registerCodeReviewerCommand(context, diagnosticCollection, findingsPanel);
	registerCommitWatcher(context, diagnosticCollection, findingsPanel);
	registerDecorationRefresh(context);

	context.subscriptions.push(disposable); //Se registran los comandos
}

// This method is called when your extension is deactivated
export function deactivate() {}
