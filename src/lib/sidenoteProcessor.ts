import * as vscode from 'vscode';
import { IStorageService } from './storageService';
import { IEditorService } from './editorService';
import { IDictionary } from './dictionary';
import Anchorer from './anchorer';
import Designer from './designer';
import { ISidenote, SidenoteFactory, CreationScenario } from './sidenote';
import { IScanResultData} from './scanner';

export default class SidenoteProcessor {
	constructor(
		public storageService: IStorageService,
		public anchorer: Anchorer,
		public editorService: IEditorService,
		public sidenoteFactory: SidenoteFactory,
		public pool: IDictionary<ISidenote>,
		public designer: Designer
	) {
		this.storageService = storageService;
		this.anchorer = anchorer;
		this.editorService = editorService;
		this.sidenoteFactory = sidenoteFactory;
		this.pool = pool;
		this.designer = designer;
	}

	async delete(sidenote: ISidenote): Promise<void> {
		await Promise.all([
			Promise.resolve(this.storageService.delete(sidenote.id)),
			this.anchorer.delete(sidenote)
		]);
		this.pool.delete(sidenote.id);
	}

	async write(sidenote: ISidenote): Promise<vscode.Position> {
		const writeResults = await Promise.all([
			this.storageService.write(sidenote),
			this.anchorer.write(sidenote)
		]);
		this.pool.add(sidenote);
		return writeResults[1];

		// технически возможна ситуация, когда нужно добавить в пул, но не использовать write;
		// с другой стороны, если используем write, практически всег надо  добавлять в пул,
		//  т.к. это означает, то создается новая заметка. хотя не факт
	}

	update(sidenote: ISidenote): ISidenote {
		const data = this.storageService.get(sidenote.id);
		if (data) sidenote.content = data.content;

		sidenote.decorations = this.designer.get(sidenote);

		return sidenote;
	}
	// update(sidenote: ISidenote, { useStorage = true }: { useStorage?: boolean }): ISidenote {

	async open(sidenote: ISidenote): Promise<vscode.TextEditor> {
		const path = this.storageService.getFilePath(sidenote.id);
		return this.editorService.open(path);
	}

	// TODO сделать все-таки чтобы функция принимала id + option bag
	// реализовать через overloading
	// async get(id?: string): Promise<ISidenote>
	async get(
		scanResult?: IScanResultData
	): Promise<ISidenote> {

		let sidenote: ISidenote;
		let queryResult: ISidenote|undefined;

		if (scanResult) {
			const { id, markerStartPos } = scanResult;
			queryResult = this.pool.get(scanResult.id);
			if (queryResult) {
				sidenote = queryResult;
			} else {
				sidenote = await this.sidenoteFactory.build(id, markerStartPos);
				this.pool.add(sidenote);
			}
		} else { // new sidenote
			sidenote = await this.sidenoteFactory.build(null);
			this.pool.add(sidenote);
		}

		return sidenote;
	}
}
