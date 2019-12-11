import * as vscode from 'vscode';
import * as path from 'path';
import * as nodeFs from 'fs';

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
	constructor(
		private scanner: Scanner,
		public utils: EditorUtils,
		private cfg: OFileSystem,
		// private vfs: vscode.FileSystem = vscode.workspace.fs,
		private fs = nodeFs
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
				fileUris.map(async fileUri => {
					const readData = await vscode.workspace.fs.readFile(fileUri);
					return Buffer.from(readData).toString('utf8');
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
		const uniqueIds = new Set(keys);
		return uniqueIds;
	}
	// TODO switch to fs.promises
	createDirectory(path: string) {
		return this.fs.mkdirSync(path);
	}

	delete(path: string) {
		return this.fs.unlinkSync(path);
	}

	exists(path: string) {
		return this.fs.existsSync(path);
	}

	read(path: string) {
		return this.fs.readFileSync(path, {
			encoding: 'utf8'
		});
	}

	write(path: string, data: string) {
		return this.fs.writeFileSync(path, data);
	}

	copy(src: string, dest: string) {
		return this.fs.copyFileSync(src, dest);
	}

	rename(oldPath: string, newPath: string) {
		return this.fs.rename(oldPath, newPath, err => {
			if (err) throw err;
		})
	}

}
