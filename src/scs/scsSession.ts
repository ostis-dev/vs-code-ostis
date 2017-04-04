import * as vs from 'vscode-languageserver';

import { SCsHoverProvider } from './scsHovers';
import { SCsCompletionItemProvider } from './scsCompletion';
import { SCsReferenceProvider } from './scsReferences';
import { SCsDocumentHighlight } from './scsHighlight';
import { SCsRename } from './scsRename';

import { SCsParsedData } from './scsParsedData';

// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities. 
export class SCsSession {

    private connection: vs.IConnection;
    private documents: vs.TextDocuments;

    private hoverProvider: SCsHoverProvider;
    private completionProvider: SCsCompletionItemProvider;
    private referenceProvider: SCsReferenceProvider;
    private docHighlight: SCsDocumentHighlight;
    private renameProvider: SCsRename;

    parsedData: SCsParsedData;

    constructor(conn: vs.IConnection, docs: vs.TextDocuments) {
        this.connection = conn;
        this.documents = docs;

        this.parsedData = new SCsParsedData(this.connection.console);
        this.parsedData.sendDiagnostic = this.connection.sendDiagnostics;

        this.hoverProvider = new SCsHoverProvider();
        this.completionProvider = new SCsCompletionItemProvider(this.parsedData);
        this.referenceProvider = new SCsReferenceProvider(this.parsedData);
        this.docHighlight = new SCsDocumentHighlight(this.parsedData);
        this.renameProvider = new SCsRename(this.parsedData);
    }

    public onHover() : vs.RequestHandler<vs.TextDocumentPositionParams, vs.Hover, void> {
        return async (params) => {
            let doc: vs.TextDocument = this.documents.get(params.textDocument.uri);
            return this.hoverProvider.provide(doc, params.position);
        };
    }

    public onWorkspaceSymbol() : vs.RequestHandler<vs.WorkspaceSymbolParams, vs.SymbolInformation[], void> {
        return async (params) => {
            return this.parsedData.provideWorkspaceSymbolUsage(params.query);
        }
    }

    public onReferences() : vs.RequestHandler<vs.ReferenceParams, vs.Location[], void> {
        return async (params) => {
            return this.referenceProvider.do(this.documents.get(params.textDocument.uri), params.position);
        }
    }

    public onCompletion() : vs.RequestHandler<vs.TextDocumentPositionParams, vs.CompletionItem[] | vs.CompletionList, void> {
        return async (params) => {
            const doc: vs.TextDocument = this.documents.get(params.textDocument.uri);
            return this.completionProvider.provide(doc, params.position);
        }
    }

    public onCompletionResolve() : vs.RequestHandler<vs.CompletionItem, vs.CompletionItem, void> {
        return async (item) => {
            return this.completionProvider.resolve(item);
        }
    }

    public onDocumentHighlight() : vs.RequestHandler<vs.TextDocumentPositionParams, vs.DocumentHighlight[], void> {
        return async (params) => {
            return this.docHighlight.do(this.documents.get(params.textDocument.uri), params.position);
        }
    }

    public onRename() : vs.RequestHandler<vs.RenameParams, vs.WorkspaceEdit, void> {
        return async (params) => {
            return this.renameProvider.do(this.documents.get(params.textDocument.uri),
                                          params.position,
                                          params.newName);
        }
    }
};