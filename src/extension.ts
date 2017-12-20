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

	context.subscriptions.push(startLangServerTCP(5000))

	let disp = vscode.workspace.onDidOpenTextDocument((doc) => {
		new CodeOutline(context);
	});

	context.subscriptions.push(disp);

	setTimeout(() => {
		new CodeOutline(context);
	},2000);
	

	// let isWin = /^win/.test(process.platform);
	// let cmd = (isWin === true ? '' : 'source ') + 'activate && textxls'

	// let p = join(__dirname,'../textxlsenv/bin')
	// vscode.window.showInformationMessage(p);

	//context.subscriptions.push(startLangServerTCP(5000));
	// context.subscriptions.push(startLangServer(cmd, [], []))

	// context.subscriptions.push(vscode.commands.registerCommand('test', (x) => {
	// 	return x;
	// }));
}
