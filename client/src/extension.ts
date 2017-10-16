/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as net from 'net';

import { Disposable, ExtensionContext, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient';


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
	console.log("Starting on port 5000");
	context.subscriptions.push(startLangServerTCP(5000));
}
