'use strict';

import { PublishDiagnosticsParams, Range, Diagnostic } from 'vscode-languageserver';

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

class FileInfo
{
    private uri: string;             // uri of a file
    private errors: Diagnostic[];    // list of all errors is a file
    private symbols: Map<string, SymbolRange[]>;       // map of all symbol occurenses

    constructor(docUri: string) {
        this.uri = docUri;
        this.errors = [];
        this.symbols = new Map<string, SymbolRange[]>();
    }

    public appendError(err) : void {
        let range = Range.create(err.location.start.line - 1, err.location.start.column - 1,
                                 err.location.end.line - 1, err.location.end.column - 1);
        let diagnostic = Diagnostic.create(range, err.toString());

        this.errors.push(diagnostic);
    }

    public clear() : void {
        this.errors = [];
        this.symbols.clear();
        this.uri = "";
    }

    public appendSymbol(name: string, location: SymbolRange) {
        if (!this.symbols.has(name)) {
            this.symbols.set(name, [location]);
        } else {
            this.symbols.get(name).push(location);
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

    public getErrors() : Diagnostic[] {
        return this.errors;
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
    public sendDiagnostic: (params: PublishDiagnosticsParams) => void;

    private doSendDiagnostic(params: PublishDiagnosticsParams): void {
        if (this.sendDiagnostic)
            this.sendDiagnostic(params);
    }

    public parseDocument(docText: string, docUri: string) {
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
                this.console.log(e.message);
            }
        }

        // send diagnostic
        if (this.sendDiagnostic) {
            let resultErrors: Diagnostic[] = [];

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

    public _onAppendSymbol(docUri: string, name:string, location) : void {
        name = name.trim();
        const finfo = this.files.get(docUri);

        if (!finfo) return; // we need to work safe

        // append symbol
        finfo.appendSymbol(name, getSymbolRange(location));
    }
};