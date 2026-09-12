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

    // Comando para revisar el codigo del documento 
	const disposable2 = vscode.commands.registerCommand('codeadvisor.codeReviwer', () => {

		const tab_size =  4; //Se considera que el tamaño de tabulacion es de 4 espacios

		// Funcion para contar el numero de espacios en una cadena de texto, consierando el tabulador 
		function countSpaces(indent: string): number {
			let ancho = 0;
			for (const char of indent) { // Se corre cada caracter de la cadena de texto
				ancho += (char === '\t') ? tab_size : 1; // Si el caracter es un tabulador se suma el tamaño de tabulacion, si no se suma 1
			}
			return ancho;
		}

		let indentationPrevious = '';

		const documentText = vscode.window.activeTextEditor?.document.getText() || ''; //Se obtiene el texto del documento actual 
		const lines = documentText.split('\n');// Se divide el texto del documento en lineas 

		// Se recorre cada linea del doumento y se verifica la identacion 
		lines.forEach((line, i) => {
			if (line.trim() === '') { // Si la linea esta vacia no se hace nada 
				return;
			}

			const indentMatch = line.match(/^[ \t]*/)?.[0] ?? '';  // Se obtiene la identacion de la linea actual 
			const currentWide = countSpaces(indentMatch); // Se obtiene el ancho de la identacion 
			const previousWide = countSpaces(indentationPrevious); // Se obtiene el ancho de la identacion de la linea anterior

			// Se verifica si la identacion de la linea actual es mayor a la anterior
			if (currentWide > previousWide) {
				const newPart = indentMatch.slice(indentationPrevious.length); 

				// Se verifica si la identacion de la linea actual tiene espacios 
				if (newPart.includes(' ')) {
					vscode.window.showWarningMessage('La linea ' + (i + 1) + ' debio usar tabulaciones en lugar de espacios para la identacion'); 
				} 
			} else {
				if (indentMatch.includes(' ')){
					vscode.window.showWarningMessage('La linea ' + (i + 1) + ' debio usar tabulaciones en lugar de espacios para la identacion');
				}
			}

			indentationPrevious = indentMatch; // Se guarda la identacion actual para comprar con la siguiente linea 
		});
	});

	context.subscriptions.push(disposable, disposable2); //Se registran los comandos 
}

// This method is called when your extension is deactivated
export function deactivate() {}
