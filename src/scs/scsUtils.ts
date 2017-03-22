'use strict';

import { TextDocument } from 'vscode-languageserver';

const FileSystem = require('fs');
const Path = require('path');


const spaces: string = ' \t\n\r":{[()]},;-=><';

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
    return text.substring(i + 1, j);
}

// ----------------------------------------------
function listFilesRecursive(dirPath: string, ext: string[]) : string[] {
	let statInfo = FileSystem.statSync(dirPath);
	let result: string[] = [];
	
	if (statInfo.isDirectory()) {  // directory
		// read directory
		let files = FileSystem.readdirSync(dirPath);
		for (let i = 0; i < files.length; ++i) {
			let childPath = Path.normalize(Path.join(dirPath, files[i]));
			let childInfo = FileSystem.statSync(childPath);

			if (childInfo.isFile()) {
				if (ext.indexOf(Path.extname(childPath)) > -1)
					result.push(childPath);
			} else {
				result = result.concat(listFilesRecursive(childPath, ext));
			}
		}
	} else if (statInfo.isFile) {
		result.push(dirPath);
	}

	return result;
}

export function getFilesInDirectory(dirPath: string, ext: string[]) : string[] {
	return listFilesRecursive(dirPath, ext);
}

export function getFileContent(filePath: string) : string {
	return FileSystem.readFileSync(filePath);
}