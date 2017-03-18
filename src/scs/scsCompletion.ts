'use strict';

import * as vs from 'vscode-languageserver';
import { getCurrentPrefix } from './scsUtils';
import { scsKeywords, scsDetails } from './scsData';

export class SCsCompletionItemProvider
{
    protected getToken(document: vs.TextDocument,
                       position: vs.Position) : string
    {
        // get current word
        return getCurrentPrefix(document, document.offsetAt(position));
    }

    public provide(document: vs.TextDocument,
                   position: vs.Position) : vs.CompletionItem[]
    {
        let suggestions: vs.CompletionItem[] = [];
        let currentWord: string = this.getToken(document, position);

        this.provideKeywords(currentWord, suggestions);

        return suggestions;
    }

    public resolve(item: vs.CompletionItem) : vs.CompletionItem
    {
        let detail = scsDetails[item.label];
        if (detail)
            item.detail = detail;

        // TODO: item.documentaion
        return item;
    }

    private provideKeywords(prefix: string,
                            items: vs.CompletionItem[])
    {
        if (prefix.length == 0)
            return;
            
        scsKeywords.forEach(key => {
            key.values.forEach(v => {
                if (v.startsWith(prefix)) {
                    items.push(vs.CompletionItem.create(v));
                }
            });
        });
    }
}
