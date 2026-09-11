import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "codeadvisor" is now active!');

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


	const disposable2 = vscode.commands.registerCommand('codeadvisor.codeReviwer', () => {
		
	})

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
