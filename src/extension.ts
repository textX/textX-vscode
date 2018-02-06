/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as net from 'net';
import * as vscode from 'vscode';
import { Disposable, ExtensionContext, workspace } from 'vscode';
import { ExecutableOptions, ServerOptions, LanguageClient, LanguageClientOptions } from 'vscode-languageclient';

import { join } from 'path';
import * as fs from 'fs';
import { setTimeout } from 'timers';
import { CodeOutline } from './outline/outline';
 
function startLangServer(command: string, args: string[], documentSelector: string[]): Disposable {

	const options: ExecutableOptions  = {
		// shell: true,
		cwd: join(__dirname,'../textxlsenv/bin')
	}
	const serverOptions: ServerOptions = {
        command,
		args,
		options
	};
	const clientOptions: LanguageClientOptions = {
		documentSelector: ['*'],
        synchronize: {
            configurationSection: command
        }
	}
	return new LanguageClient(command, serverOptions, clientOptions).start();
}

function startLangServerTCP(addr: number): Disposable {
	const serverOptions: ServerOptions = function() {
		return new Promise((resolve, reject) => {
			var client = new net.Socket();
			client.connect(addr, "127.0.0.1", function() {
				resolve({
					reader: client,
					writer: client
				});
			});
		});
	}

	const clientOptions: LanguageClientOptions = {
		documentSelector: ['*'], // filter documents on server (based on configuration file)
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher('**/*.*')
		}
	}
	return new LanguageClient(`tcp lang server (port ${addr})`, serverOptions, clientOptions).start();
}

export function activate(context: ExtensionContext) {

	// Path to virtualenv where textx language server is installed - from configuration section
	const pyEnvPath : string = vscode.workspace.getConfiguration().get('textxls.env');

	// Path to __main__.py module inside the extension
	// When deploying extension, copy https://github.com/textX-tools/textX-languageserver/tree/master/textx_langserv
	// in root of this extension
	const pyMainPath : string = join(__dirname,'../textx_langserv/__main__.py')

	// Path to installation guide file
	const instGuidePath : string = join(__dirname,'../installation-guide.txt')

	// Add error callback when spawning process in language-client
	// On error, open installation guide
	function openInstallationGuide() {
		// Local installation guide
		let guideTxt = fs.readFileSync(instGuidePath, 'utf8');
		// Open installation guide in new tab
		vscode.workspace.openTextDocument(instGuidePath).then(doc=> {
			vscode.window.showTextDocument(doc);                   
	   	});
		
	}

	let lsDisp: Disposable = null;
	// Configuration section exists
	// Comment when debugging via tcp
	// if (pyEnvPath){
	// 	lsDisp = startLangServer(pyEnvPath, [pyMainPath], []);
	// }
	// // Language server is installed globaly
	// else{
	// 	lsDisp = startLangServer('textxls', [], []);
	// }

	// Uncomment for tcp
	lsDisp = startLangServerTCP(5000);

	context.subscriptions.push(lsDisp);
	

	// Code outline
	let disp = vscode.workspace.onDidOpenTextDocument((doc) => {
		new CodeOutline(context);
	});

	context.subscriptions.push(disp);
	

	// Code lens
	vscode.commands.registerCommand('code_lens_references', (...args) => {
		// Change cursor position
		const editor = vscode.window.activeTextEditor;
        const position = editor.selection.active;
        var newPosition = position.with(args[0], args[1]);
        var newSelection = new vscode.Selection(newPosition, newPosition);
		editor.selection = newSelection;
		// Trigger find all references command
		vscode.commands.executeCommand('editor.action.referenceSearch.trigger');
	});

}
