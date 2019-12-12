import * as vscode from 'vscode';
import * as path from 'path';
import * as nodeFs from 'fs';
import { TextEncoder, TextDecoder } from 'util';

import {
	IScanData,
	EditorUtils,
	Scanner
} from './types';

export type OFileSystem = {
	// 🕮 <YL> e4f5fe76-3db2-4c20-a796-1300f779ff6f.md
	worskspaceFilter: {
		include: string,
		exclude: string
	}
}

export default class FileSystem
// implements vscode.FileSystem
{
	private textEncoder: TextEncoder = new TextEncoder();
	private textDecoder: TextDecoder = new TextDecoder();
	// 🕮 <YL> 9753d71e-a4e4-4778-af8c-181e62776254.md

	constructor(
		private scanner: Scanner,
		public utils: EditorUtils,
		private cfg: OFileSystem,
		private fs = vscode.workspace.fs,
		private nfs = nodeFs
	) {}

	async scanDirectoryFilesContentsForKeys(folder: vscode.Uri): Promise<Set<string>> {
		// 🕮 <YL> 9a3ca084-350c-49c3-8fa8-631dbc63a254.md
		const getFiles = async (folder: vscode.Uri): Promise<vscode.Uri[]> => {
			return vscode.workspace.findFiles(
				new vscode.RelativePattern(folder.fsPath, this.cfg.worskspaceFilter.include),
				new vscode.RelativePattern(folder.fsPath, this.cfg.worskspaceFilter.exclude),
			);
		};

		const readFiles = (fileUris: vscode.Uri[]) => {
			return Promise.all(
				fileUris.map(async uri => {
					const data = await vscode.workspace.fs.readFile(uri);
					return this.textDecoder.decode(data);
				})
			);
		};

		const scanContents = (contents: string[]) => {
			const fileMatches = contents
				.map(content => this.scanner.scanText(content), this.scanner)
				.filter(scanData => scanData !== undefined) as unknown as IScanData[]; // 🕮 <YL> c02edcce-c3e0-48a5-ab51-c4d3053ec7d5.md
			const flat = Array.prototype.concat(...fileMatches); // return files.flat();
			const keysOnly: string[] = flat.map(scanData => scanData.key);
			return keysOnly;
		};

		const fileUris = await getFiles(folder);
		const contents = await readFiles(fileUris);
		const keys = scanContents(contents);
		const uniqueKeys = new Set(keys);
		return uniqueKeys;
	}

	createDirectory(uri: vscode.Uri) {
		return this.fs.createDirectory(uri);
	}

	delete(uri: vscode.Uri) {
		return this.fs.delete(uri, { recursive: true, useTrash: true });
	}

	// TODO get done without it
	exists(path: string) {
		return this.nfs.existsSync(path);
	}

	async read(uri: vscode.Uri) {
		const data = await this.fs.readFile(uri);
		return this.textDecoder.decode(data);
	}

	write(uri: vscode.Uri, data: string) {
		const encodedData = this.textEncoder.encode(data);
		return this.fs.writeFile(uri, encodedData);
	}

	copy(src: vscode.Uri, dest: vscode.Uri) {
		return this.fs.copy(src, dest, { overwrite: false });
	}

	rename(oldName: vscode.Uri, newName: vscode.Uri) {
		return this.fs.rename(oldName, newName);
	}

}
