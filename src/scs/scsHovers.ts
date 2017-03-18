'use strict';

import * as vs from 'vscode-languageserver';

import { scsDetails } from './scsData';
import { getCurrentWord } from './scsUtils';

export class SCsHoverProvider
{

    public provide(document: vs.TextDocument,
                   position: vs.Position) : vs.Hover
    {
        let token = getCurrentWord(document, document.offsetAt(position));
        let details = scsDetails[token];
        if (details) {
            return {
                contents: details
            };
        }

        return null;
    }
}