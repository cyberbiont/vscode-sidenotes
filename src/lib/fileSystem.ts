import * as vscode from 'vscode';
import * as path from 'path';
import * as nodeFs from 'fs';

import {
	IScanData,
	EditorUtils,
	Scanner
} from './types';

export type OFileSystem = {
	sources: {
		// 🕮 e4f5fe76-3db2-4c20-a796-1300f779ff6f
		matchFiles: string, // GlobPattern
		excludeFiles: string, // GlobPattern
	}
}

export default class FileSystem
// implements vscode.FileSystem
{
	constructor(
		private scanner: Scanner,
		public utils: EditorUtils,
		private cfg: OFileSystem,
		private vfs: vscode.FileSystem = vscode.workspace.fs,
		private fs = nodeFs
	) {}

	async scanDirectoryFilesContentsForIds(folder: vscode.Uri): Promise<Set<string>> {
		// 🕮 9a3ca084-350c-49c3-8fa8-631dbc63a254
		const getFiles = async (folder: vscode.Uri): Promise<vscode.Uri[]> => {
			return vscode.workspace.findFiles(
				new vscode.RelativePattern(folder.fsPath, this.cfg.sources.matchFiles),
				new vscode.RelativePattern(folder.fsPath, this.cfg.sources.excludeFiles),
			);
		}

		const readFiles = (fileUris: vscode.Uri[]) => {
			return Promise.all(
				fileUris.map(async fileUri => {
					const readData = await this.vfs.readFile(fileUri);
					return Buffer.from(readData).toString('utf8');
				})
			);
		};

		const scanContents = (contents: string[]) => {
			const fileMatches = contents
				.map(content => this.scanner.getIdsFromText(content), this.scanner)
				.filter(scanData => scanData !== undefined) as unknown as IScanData[]; // 🕮 c02edcce-c3e0-48a5-ab51-c4d3053ec7d5
			const flat = Array.prototype.concat(...fileMatches); // return files.flat();
			const idsOnly: string[] = flat.map(scanData => scanData.id);
			return idsOnly;
		};

		const fileUris = await getFiles(folder);
		const contents = await readFiles(fileUris);
		const ids = scanContents(contents);
		const uniqueIds = new Set(ids);
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
