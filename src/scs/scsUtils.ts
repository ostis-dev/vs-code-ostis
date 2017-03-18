'use strict';

import { TextDocument } from 'vscode-languageserver';

const spaces: string = ' \t\n\r":{[()]},';

export function getCurrentPrefix(document: TextDocument, offset: number) {
	let i = offset - 1;
	let text = document.getText();
	while (i >= 0 && spaces.indexOf(text.charAt(i)) === -1) {
		i--;
	}
	return text.substring(i + 1, offset);
}

export function getCurrentWord(document: TextDocument, offset: number) {
    let i = offset - 1;
	let text = document.getText();
	while (i >= 0 && spaces.indexOf(text.charAt(i)) === -1) {
		i--;
	}

    let j = offset;
    while (j < text.length && spaces.indexOf(text.charAt(j)) === -1) {
        j++;
    }
    return text.substring(i + 1, j - 1);
}