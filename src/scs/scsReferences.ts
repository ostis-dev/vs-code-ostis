import * as vs from 'vscode-languageserver';

import { SCsParsedData } from './scsParsedData';
import { getCurrentWord } from './scsUtils';

export class SCsReferenceProvider {
    private parsedData: SCsParsedData;

    constructor(data: SCsParsedData) {
        this.parsedData = data;
    }

    public do(document: vs.TextDocument, pos: vs.Position) : vs.Location[] {
        const symbol: string = getCurrentWord(document, document.offsetAt(pos));
        return this.parsedData.provideReferences(symbol);
    }
}