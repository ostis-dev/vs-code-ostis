'use strict';

import {
    IPCMessageReader, IPCMessageWriter,
	createConnection, IConnection,
	TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity, 
	InitializeParams, InitializeResult,
    TextDocumentPositionParams, CompletionItem,
    Hover, DidChangeTextDocumentParams,
    WorkspaceSymbolParams, SymbolInformation,
    TextDocumentSyncKind
} from 'vscode-languageserver';

import { SCsHoverProvider } from './scsHovers';
import { SCsCompletionItemProvider } from './scsCompletion';
import { SCsParsedData } from './scsParsedData';
import { getFilesInDirectory, getFileContent } from './scsUtils';

// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities. 
class CoreContext {
    hoverProvider: SCsHoverProvider;
    completionProvider: SCsCompletionItemProvider;

    parsedData: SCsParsedData;

    constructor() {

        this.parsedData = new SCsParsedData(connection.console);
        this.parsedData.sendDiagnostic = connection.sendDiagnostics;

        this.hoverProvider = new SCsHoverProvider();
        this.completionProvider = new SCsCompletionItemProvider(this.parsedData);
    }
};

let coreCtx: CoreContext;
let workspaceRoot: string;

function parseAllOpenedDocuments() {
    documents.all().forEach((doc: TextDocument, index: number, array: TextDocument[]) => {
        coreCtx.parsedData.parseDocument(doc.getText(), doc.uri);
    });
}

function parseDocumentsInFolder(path: string) {
    connection.console.log("Parse files in: " + path);
    
    let files: string[] = getFilesInDirectory(path, ['.scs', '.scsi']);
    files.forEach((filePath: string) => {
        const content: string = getFileContent(filePath).toString();
        coreCtx.parsedData.parseDocument(content, filePath);
    });
    
}

connection.onInitialize((params): InitializeResult => {
	
    workspaceRoot = params.rootPath;
    coreCtx = new CoreContext();

    if (workspaceRoot)
        parseDocumentsInFolder(workspaceRoot);

	return {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Full,
            hoverProvider: true,
            completionProvider: { resolveProvider: true },
            workspaceSymbolProvider: true
            }
		}
});

connection.onDidChangeConfiguration((params) => {
    parseAllOpenedDocuments();
});

connection.onDidChangeWatchedFiles(() => {
    connection.console.log("Watched files changed");

    parseAllOpenedDocuments();
});

connection.onHover((params: TextDocumentPositionParams) : Hover => {
    let doc: TextDocument = documents.get(params.textDocument.uri);
    return coreCtx.hoverProvider.provide(doc, params.position);
});

connection.onWorkspaceSymbol((params: WorkspaceSymbolParams) : SymbolInformation[] => {
    return null;
});

connection.onCompletion((params: TextDocumentPositionParams) : CompletionItem[] => {
    let doc: TextDocument = documents.get(params.textDocument.uri);
    return coreCtx.completionProvider.provide(doc, params.position);
});

connection.onCompletionResolve((item: CompletionItem) : CompletionItem => {
    return coreCtx.completionProvider.resolve(item);
});

documents.onDidChangeContent((event) => {
    coreCtx.parsedData.parseDocument(event.document.getText(), event.document.uri);
});

// Listen on the connection
connection.listen();