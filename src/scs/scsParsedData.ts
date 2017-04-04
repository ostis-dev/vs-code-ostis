'use strict';

import * as vs from 'vscode-languageserver';

import { makeUri } from './scsUtils';

const scsParser = require('./scsSyntax');

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
            line: location.start.line,
            column: location.start.column
        },
        end: {
            line: location.end.line,
            column: location.end.column
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
    private errors: vs.Diagnostic[];    // list of all errors is a file
    private symbols: Map<string, SymbolRange[]>;       // map of all symbol occurenses

    constructor(docUri: string) {
        this.uri = docUri;
        this.errors = [];
        this.symbols = new Map<string, SymbolRange[]>();
    }

    public appendError(err) : void {
        let range = vs.Range.create(err.location.start.line - 1, err.location.start.column - 1,
                                 err.location.end.line - 1, err.location.end.column - 1);
        let diagnostic = vs.Diagnostic.create(range, err.toString());

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
        let finfo = new FileInfo(docUri);
        this.files.set(docUri, finfo);

        try {
            scsParser.parse(docText, {
                docUri: docUri,
                parsedData: this
            });
        } catch (e) {
            if (e instanceof scsParser.SyntaxError)
            {
                finfo.appendError(e);
            } else {
                this.console.log(e.stack);
            }
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

    public _onAppendSymbol(docUri: string, name:string, location) : void {
        // correct location

        name = name.trim();
        const finfo = this.files.get(docUri);

        if (!finfo)
            return; // we need to work safe

        // append symbol
        finfo.appendSymbol(name, getSymbolRange(location));
    }
};