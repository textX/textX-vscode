/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as net from 'net';
import * as vscode from 'vscode';
import { Disposable, ExtensionContext } from 'vscode';
import { ExecutableOptions, ServerOptions, LanguageClient, LanguageClientOptions } from 'vscode-languageclient';

function startLangServer(command: string, args: string[], documentSelector: string[]): Disposable {
	const options: ExecutableOptions  = {
		shell: true,
		cwd: 'c:\\Users\\Daniel\\Desktop\\client\\textxlsenv\\Scripts'
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
		//documentSelector: ['textx', 'textX'],
		documentSelector: ['*'], // filter documents on server (based on configuration file)
        // synchronize: {
        //     fileEvents: workspace.createFileSystemWatcher('**/*.*')
		// }
	}
	return new LanguageClient(`tcp lang server (port ${addr})`, serverOptions, clientOptions).start();
}

export function activate(context: ExtensionContext) {
	let isWin = /^win/.test(process.platform);
	let cmd = (isWin === true ? '' : 'source ') + 'activate && textxls'

	// context.subscriptions.push(startLangServerTCP(5000));
	context.subscriptions.push(startLangServer(cmd, [], []))
}

