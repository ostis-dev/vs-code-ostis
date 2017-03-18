'use strict';

import {
    IPCMessageReader, IPCMessageWriter,
	createConnection, IConnection,
	TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity, 
	InitializeParams, InitializeResult,
    TextDocumentPositionParams, CompletionItem,
    Hover
} from 'vscode-languageserver';

import { SCsHoverProvider } from './scsHovers';
import { SCsCompletionItemProvider } from './scsCompletion';

// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

documents.onDidChangeContent((event) => {
    connection.console.log("Content changed");
});

// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities. 
class CoreContext {
    hoverProvider: SCsHoverProvider;
    completionProvider: SCsCompletionItemProvider;

    constructor() {
        this.hoverProvider = new SCsHoverProvider();
        this.completionProvider = new SCsCompletionItemProvider();
    }
};

let coreCtx: CoreContext;
let workspaceRoot: string;

connection.onInitialize((params): InitializeResult => {
	
    workspaceRoot = params.rootPath;
    coreCtx = new CoreContext();

	return {
		capabilities: {
			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: documents.syncKind,
            hoverProvider: true,
            completionProvider: { resolveProvider: true }
            }
		}
});

connection.onDidChangeConfiguration((params) => {
    connection.console.log("Configuration changed");
});

connection.onDidChangeWatchedFiles(() => {
    connection.console.log("Watched files changed");
});

connection.onHover((params: TextDocumentPositionParams) : Hover => {
    let doc: TextDocument = documents.get(params.textDocument.uri);
    return coreCtx.hoverProvider.provide(doc, params.position);
});

connection.onCompletion((params: TextDocumentPositionParams) : CompletionItem[] => {
    let doc: TextDocument = documents.get(params.textDocument.uri);
    return coreCtx.completionProvider.provide(doc, params.position);
});

connection.onCompletionResolve((item: CompletionItem) : CompletionItem => {
    return coreCtx.completionProvider.resolve(item);
});

// Listen on the connection
connection.listen();