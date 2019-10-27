import * as vscode from 'vscode';
import { ActiveEditorUtils } from  './types';
import * as fs from 'fs';
import * as path from 'path';

export interface IStorable {
	id: string
	content: string|undefined
}

export interface IStorageService {
	delete(id: string): boolean|Promise<boolean>
	write(data: IStorable): boolean|Promise<boolean>
	get(id: string): IStorable
	getFilePath(id: string): string
}

export type IFileStorageCfg = {
	notesSubfolder: string
}
export class FileStorage implements IStorageService {
	private pathCache: {
		[id: string]: string
	}

	constructor(
		public activeEditorUtils: ActiveEditorUtils,
		public cfg: IFileStorageCfg,
		public ext: string = '.md'
	) {
		this.cfg = cfg;
		this.ext = ext;
		this.pathCache = {};
		this.activeEditorUtils = activeEditorUtils;
	}

	get(id: string): IStorable {
		try {
			const content = fs.readFileSync(this.getFilePath(id), { encoding: 'utf8' });
			return {
				id,
				content
			}
		} catch (e)	{
			vscode.window.showErrorMessage(`<Failed to open file>. ${e.message}`);
			return {
				id,
				content: undefined
			}
		}
	}

	getFilePath(id: string): string {
		if (this.pathCache[id]) return this.pathCache[id];
		const folderPath = this.activeEditorUtils.getWorkspaceFolderPath();

		const folder = path.join(folderPath, this.cfg.notesSubfolder);
		if (!fs.existsSync(folder)) fs.mkdirSync(folder);
		const filePath = path.join(folder, `${id}${this.ext}`); // absolute path to the file;

		this.pathCache[id] = filePath;
		return filePath;
	}

	delete(id): boolean {
		try {
			fs.unlinkSync(this.getFilePath(id));
			return true;
		} catch (e) {
			return false;
			// if file is not present, continue
		}
	}

	async write(data: IStorable): Promise<boolean> {
		const path = this.getFilePath(data.id);
		if (!fs.existsSync(path)) {
			fs.writeFileSync(path, data.content);
			return true;
		}
		return false;
	}

}
