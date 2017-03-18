// 'use strict';

// import * as path from 'path';

// import * as vscode from 'vscode';
// import { SCsHoverProvider } from './scs/scsHovers';
// import { SCsCompletionItemProvider }  from './scs/scsCompletion';

// export function activate(context: vscode.ExtensionContext) {

// 	const SCS_MODE: vscode.DocumentFilter = { language: 'scs', scheme: 'file' };

// 	context.subscriptions.push(vscode.languages.registerHoverProvider(SCS_MODE, new SCsHoverProvider()));
// 	context.subscriptions.push(vscode.languages.registerCompletionItemProvider(SCS_MODE, new SCsCompletionItemProvider()));
// }

'use strict';

import * as path from 'path';

import { workspace, Disposable, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';

export function activate(context: ExtensionContext) {

	// The server is implemented in node
	let serverModule = context.asAbsolutePath(path.join('out', path.join('scs', 'scsServer.js')));
	// The debug options for the server
	let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
	
	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run : { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	}
	
	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: ['scs', 'scsi'],
		synchronize: {
			// Synchronize the setting section 'languageServerExample' to the server
			configurationSection: 'scsLanguageServer',
			// Notify the server about file changes to '.clientrc files contain in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	}
	
	// Create the language client and start the client.
	let disposable = new LanguageClient('scsLanguageServer', 'SCs language Server', serverOptions, clientOptions).start();
	
	// Push the disposable to the context's subscriptions so that the 
	// client can be deactivated on extension deactivation
	context.subscriptions.push(disposable);
}