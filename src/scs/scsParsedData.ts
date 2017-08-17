'use strict';

import * as vs from 'vscode-languageserver';

import { ANTLRInputStream, CommonTokenStream, ParserErrorListener } from 'antlr4ts';

import { makeUri } from './scsUtils';

const scsParser = require('./syntax/scsParser');
const scsLexer = require('./syntax/scsLexer');

interface ParseError {
    line: number,
    offset: number,
    len: number,
    msg: string
}

class ErrorListener implements ParserErrorListener {

    private callback:(err: ParseError) => void = null;

    constructor(callback) {
        this.callback = callback;
    }

    syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg: string, e) : void {
        this.callback({
            line: line,
            offset: charPositionInLine,
            len: offendingSymbol ? offendingSymbol.text.length : 0,
            msg: msg
        });
    }
};

interface SymbolPosition
{
    line: number;   // index of file line (starts with 1)
    column: number; // index of symbol offset in a line (starts with 1)
}

interface SymbolRange
{
    start: SymbolPosition;
    end: SymbolPosition;
}

function isSymbolPositionEqual(a: SymbolPosition, b: SymbolPosition) : boolean {
    return (a.line === b.line && a.column == b.column);
}

function isSymbolRangeEqual(a: SymbolRange, b:SymbolRange) : boolean {
    return isSymbolPositionEqual(a.start, b.start) && isSymbolPositionEqual(a.end, b.end);
}

function getSymbolRange(location) : SymbolRange {
    return {
        start: {
            line: location.line,
            column: location.offset
        },
        end: {
            line: location.line,
            column: location.offset + location.len
        }
    };
}

function toRange(range: SymbolRange): vs.Range {
    const begPos: vs.Position = vs.Position.create(range.start.line - 1, range.start.column - 1);
    const endPos: vs.Position = vs.Position.create(range.end.line - 1, range.end.column - 1);
    return vs.Range.create(begPos, endPos);
}

class FileInfo
{
    private uri: string;             // uri of a file
    public errors: vs.Diagnostic[];    // list of all errors is a file
    private symbols: Map<string, SymbolRange[]>;       // map of all symbol occurenses

    constructor(docUri: string) {
        this.uri = docUri;
        this.errors = [];
        this.symbols = new Map<string, SymbolRange[]>();
    }

    public appendError(err: ParseError) : void {
        let range = vs.Range.create(err.line, err.offset, err.line, err.offset + err.len);
        let diagnostic = vs.Diagnostic.create(range, err.msg);

        this.errors.push(diagnostic);
    }

    public clear() : void {
        this.errors = [];
        this.symbols.clear();
        this.uri = "";
    }

    public appendSymbol(name: string, location: SymbolRange) {
        const list = this.symbols.get(name);
        if (list) {
            const found = list.find((value: SymbolRange) : boolean => {
                return (isSymbolRangeEqual(location, value));
            });

            if (!found)
                list.push(location);
        } else {
            this.symbols.set(name, [location]);
        } 
    }

    public provideComplete(prefix: string, docUri: string) : string[] {
        let result: string[] = [];
        this.symbols.forEach((value: SymbolRange[], key: string) => {
            if (key.startsWith('..') && docUri !== this.uri)
                return;
            
            if (key.startsWith(prefix)) {
                result.push(key);
            }
        });

        return result;
    }

    public getSymbolsNum() {
        return this.symbols.size;
    }

    public getErrors() : vs.Diagnostic[] {
        return this.errors;
    }

    public getSymbolRanges(name: string) : SymbolRange[] {
        return this.symbols.get(name);
    }
};

export class SCsParsedData
{
    private console;
    private files: Map<string, FileInfo>;

    constructor(inConsole) {
        this.console = inConsole;
        this.files = new Map<string, FileInfo>();
    }

    // send diagnostic callback
    public sendDiagnostic: (params: vs.PublishDiagnosticsParams) => void;

    private doSendDiagnostic(params: vs.PublishDiagnosticsParams): void {
        if (this.sendDiagnostic)
            this.sendDiagnostic(params);
    }

    public parseDocument(docText: string, docUri: string) {
        
        docUri = makeUri(docUri);
        const finfo = new FileInfo(docUri);
        this.files.set(docUri, finfo);

        try {

            let chars = new ANTLRInputStream(docText);
            let lexer = new scsLexer.scsLexer(chars);
            let tokens  = new CommonTokenStream(lexer);
            let parser = new scsParser.scsParser(tokens);
            parser.buildParseTrees = false;

            parser.docUri = docUri;
            parser.parsedData = this;

            parser.addErrorListener(new ErrorListener(function(err) {
                finfo.appendError(err);
            }));

            let tree = parser.syntax();

        } catch (e) {
            this.console.log(e.stack);
        }

        // send diagnostic
        if (this.sendDiagnostic) {
            let resultErrors: vs.Diagnostic[] = [];

            if (finfo) {
                resultErrors = finfo.getErrors();
            }

            this.doSendDiagnostic({
                uri: docUri,
                diagnostics: resultErrors
            });
        }
    }

    public provideAutoComplete(docUri: string, prefix: string) : string[] {
        /// TODO: make unique and faster
        let result: string[] = [];

        this.files.forEach((value: FileInfo, key) => {
            result = result.concat(value.provideComplete(prefix, docUri));
        });

        let uniqueResult = result.filter(function(item, pos) {
            return result.indexOf(item) == pos;
        });

        return uniqueResult;
    }

    public provideWorkspaceSymbolUsage(query: string) : vs.SymbolInformation[] {
        let result: vs.SymbolInformation[] = [];

        this.files.forEach((value: FileInfo, key) => {
            const ranges = value.getSymbolRanges(query);

            if (ranges) {
                ranges.forEach((r: SymbolRange) => {
                    const sym:vs.SymbolInformation  = vs.SymbolInformation.create(key,
                        vs.SymbolKind.Variable, toRange(r));
                });
            }
        });

        return result;
    }

    public provideReferencesInFile(query: string, uri: string) : vs.Location[] {
        const result: vs.Location[] = [];

        const fileInfo: FileInfo = this.files.get(uri);
        if (fileInfo) {
            const ranges: SymbolRange[] = fileInfo.getSymbolRanges(query);

            if (ranges) {
                ranges.forEach((r: SymbolRange) => {
                    result.push(vs.Location.create(uri, toRange(r)));
                });
            }
        }

        return result;
    }

    public provideReferences(query: string) : vs.Location[] {
        let result: vs.Location[] = [];
        this.files.forEach((value: FileInfo, key: string) => {
            const ranges: SymbolRange[] = value.getSymbolRanges(query);

            if (ranges) {
                ranges.forEach((r: SymbolRange) => {
                    result.push(vs.Location.create(key, toRange(r)));
                });
            }
        });

        return result;
    }

    public _onAppendSymbol(docUri: string, name: string, location) : void {
        const finfo = this.files.get(docUri);

        if (!finfo)
            return; // we need to work safe

        name = name.trim();
        // append symbol
        finfo.appendSymbol(name, getSymbolRange(location));
    }

    public _onAppendError(docUri: string, err: ParseError) : void {
        const finfo = this.files.get(docUri);

        this.console.log(docUri, err.msg);

        if (!finfo)
            return; // we need to work safe

        // append symbol
        finfo.appendError(err);
    }

    public _log(msg: string) {
        this.console.log(msg);
    }
};