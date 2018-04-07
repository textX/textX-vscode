/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as net from 'net';
import * as vscode from 'vscode';
import { Disposable, ExtensionContext, workspace } from 'vscode';
import { ExecutableOptions, ServerOptions, LanguageClient, LanguageClientOptions, StreamInfo } from 'vscode-languageclient';

import { join } from 'path';
import * as fs from 'fs';
import { setTimeout } from 'timers';
import { CodeOutline } from './outline/outline';

import * as cp from "child_process"
import * as portfinder from "portfinder";
import 'constants';
import { ConfigKeys } from './constants';
import { resolve } from 'url';

var SERVER_CONFIG = require('../server_config.json')

function startLangServer(command: string, args: string[], documentSelector: string[]): Disposable {

	const options: ExecutableOptions  = {
		
	}
	const serverOptions: ServerOptions = {
        command,
		args,
		options
	};
	const clientOptions: LanguageClientOptions = {
		documentSelector: ['*'],
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher('**/*.*')
		},
		initializationOptions: {
			"SERVER_TYPE": SERVER_CONFIG.SERVER_TYPE,
			"SERVER_CONNECTION" : SERVER_CONFIG.SERVER_CONNECTION
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
		},
		initializationOptions: {
			"SERVER_TYPE": SERVER_CONFIG.SERVER_TYPE,
			"SERVER_CONNECTION" : SERVER_CONFIG.SERVER_CONNECTION
		}
	}
	return new LanguageClient(`tcp lang server (port ${addr})`, serverOptions, clientOptions).start();
}

var PROCESS: cp.ChildProcess = null;
export function activate(context: ExtensionContext) {

	findPythonExecutable().then(python => {

		if (!python){
			vscode.window.showWarningMessage("Python 3 is required!");
			return;
		}

		// Path to __main__.py module inside the extension
		const textxls_main : string = join(__dirname,'../textX-languageserver/src/__main__.py')

		let lsDisp: Disposable = null;

		// START FOR PUBLISH
		lsDisp = startLangServer(python, [textxls_main], []);

		// START CLIENT TCP
		// lsDisp = startLangServerTCP(5000);
		context.subscriptions.push(lsDisp);

		registerCodeOutline(context);
		registerLensReferences(context);

		
		// START SERVER AND CLIENT TCP
		// startServerAndClientTCP(python, textxls_main, context).then((proc) => {
		// 	PROCESS = proc;
		// });
	});
}


function startServerAndClientTCP(python: string, textxls_main: string, context: vscode.ExtensionContext): Promise<cp.ChildProcess> {
	return new Promise((resolve, reject) => {

		portfinder.getPortPromise().then((port) => {
			let command = python + ' ' + textxls_main + ' --tcp --port ' + port.toString();
			let process = cp.exec(command);

			if (process.pid){
				let client = startLangServerTCP(port);
				context.subscriptions.push(client);

				registerCodeOutline(context);
				registerLensReferences(context);
				
				resolve(process);
			}

		});

	});
}

function registerLensReferences(context: vscode.ExtensionContext): void{
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

function registerCodeOutline(context: vscode.ExtensionContext): void{
	// Wait LS to register commands
	setTimeout(() => {
		let disp = vscode.workspace.onDidOpenTextDocument((doc) => {
			new CodeOutline(context);
		});
		context.subscriptions.push(disp);
	}, 500);
}

function findPythonExecutable() : Promise<string>{
	const python = 'python';
	const python3 = 'python3';

	return new Promise((resolve, reject) => {
		// Check if python path is configured manually	
		let path = vscode.workspace.getConfiguration().get<string>(ConfigKeys.TEXTXLS_PYTHON_PATH);
		if (path)
			if (isPython3(path))
				resolve(path);
			else
				resolve(null);
		else
			// Check python cmd
			if (isPython3(python))
				resolve(python);
			else
				if (isPython3(python3))
					resolve(python3);
				else
					resolve(null);

	});

	function isPython3(python) {
		try{
			let stdout = cp.execFileSync(python, ['--version'], { });
			let version = getPythonVersion(stdout);
			if (version && version[0] === '3'){
				return true;
			}else{
				return false;
			}
		}catch{
			return false;
		}

	}

	function getPythonVersion(stdout){
		let regArray = new RegExp('\\d.\\d.\\d').exec(stdout);
		return regArray != null ? regArray[0] : null;
	}
}

export function deactivate() {
	// For TCP
	if (PROCESS)
		PROCESS.kill('SIGHUP');
}