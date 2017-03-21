'use strict';

import { PublishDiagnosticsParams, Range, Diagnostic } from 'vscode-languageserver';

const scsParser = require('./scsSyntax');

export class SCsParsedData
{
    // send diagnostic callback
    public sendDiagnostic: (params: PublishDiagnosticsParams) => void;

    // contains all erros by files. Key - document uri, Value - syntax error object
    public errors = {};

    private doSendDiagnostic(params: PublishDiagnosticsParams): void {
        if (this.sendDiagnostic)
            this.sendDiagnostic(params);
    }

    public parseDocument(docText: string, docUri: string) {

        try {
            
            scsParser.parse(docText);
            
            // no errors
            this.errors[docUri] = [];
            this.doSendDiagnostic({
                uri: docUri,
                diagnostics: []
            });

        } catch (e) {
            if (e instanceof scsParser.SyntaxError)
            {
                this.errors[docUri] = [ e ];
            }

            // send diagnostic
            if (this.sendDiagnostic) {
                let resultErrors:Diagnostic[] = [];
                
                const err = this.errors[docUri];
                if (err) {
                    err.forEach((value) => {
                        let range = Range.create(value.location.start.line - 1, value.location.start.column,
                                                 value.location.end.line - 1, value.location.end.column);
                        let diagnostic = Diagnostic.create(range, value.toString());
                        resultErrors.push(diagnostic);
                    });
                }

                this.doSendDiagnostic({
                    uri: docUri,
                    diagnostics: resultErrors
                });
            }
        }
    }


};