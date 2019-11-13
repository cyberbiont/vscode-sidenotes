import * as vscode from 'vscode';
import {
	ActiveEditorUtils,
	IScanData,
	ISidenote,
	Inspector,
	Pool,
	Pruner,
	Scanner,
	SidenoteProcessor,
	Styler,
} from './types';

export default class Commands {
	constructor(
		private styler: Styler<ISidenote>,
		private pruner: Pruner,
		private sidenoteProcessor: SidenoteProcessor,
		private scanner: Scanner,
		// private pool: IDictionary<ISidenote>,
		private pool: Pool,
		private inspector: Inspector,
		private activeEditorUtils: ActiveEditorUtils
	) {}

	/**
	*  should be called on extension activation and changes of active editor
	*/
	async scanDocumentAnchors(): Promise<void> {
		// TODO: import activeEditorUtils?

		// надо просто знать, если уже уже пул для этого документа или нет, если есть, то не пересканируем, просто апдейтим декорации
		if (!this.pool.getIsInitialized()) {
			try {
				const scanResults = this.scanner.getIdsFromText();
				if (!scanResults) {
					// vscode.window.showInformationMessage('no sidenotes found in current document');
					return;
				}

				await Promise.all(scanResults.map(this.sidenoteProcessor.create, this.sidenoteProcessor));

				// scanResults[Symbol.asyncIterator] = async function* recreate() {
				// 	for (const result of this) { yield this.sidenoteProcessor.create(result); }
				// }.bind(this);
				// for await(let result of scanResults) {}

				/* 'for await' при обходе цикла анализировать результаты предыдущих итераций
					(нужно для поддержки множественных заметок, чтобы отcлеживать,
					повторяется ли id и позиция)
					но это замедляет цикл */

				/* т.к. у нас в цикле выполняется асинхронная функция, forEach происходит
				асинхронно, соответственно, мы не имеем возможности в одном из циклов проверить
				результат предыдущего (т.е. достать что-либо из pool) можно тут применить
				асинхронный итератор, но пострадает производительность (лучше все-таки в цикле
				все делать) т.о. проверка должна происходить в момент добавления элемента в пул,
				но мы, строго говоря, не знаем, в каком порядке будут добавляться элементы
				set использовать нельзя, т.к. у нас коллекция объектов, которые по сути разные, но
				нам надо проверить на св-во id
				с другой стороны, нам не ваен порядок, главное чтобы одинаковые объекты не добавлялись
				*/


				// await scanResults.forEach(recreate, this);
				this.pool.setIsInitialized(true);

			} catch(e) {
				console.log(e);
			}
		}

		this.styler.updateDecorations();
	}

	async run(): Promise<void> {

		try {
			const scanData = this.scanner.scanLine();

			let obtainedSidenote = await this.sidenoteProcessor.getOrCreate(scanData);

			let sidenote: ISidenote|undefined;
			if (this.inspector.isBroken(obtainedSidenote)) {
				sidenote = await this.sidenoteProcessor.handleBroken(obtainedSidenote);
			} else sidenote = obtainedSidenote;

			if (sidenote) await this.sidenoteProcessor.open(sidenote);

			this.styler.updateDecorations();

		} catch(e) {
			console.log(e);
		}
	}

	async delete(): Promise<void> {
		const scanData = this.scanner.scanLine();
		if (!scanData) {
			vscode.window.showInformationMessage('There is no sidenotes attached at current cursor position');
			return;
		}

		// TODO ask user if he wants to delete anchor only or associated file too (in this case scan for other remaining anchors with this id in workspace and delete them);

		let sidenote = await this.sidenoteProcessor.getOrCreate(scanData);
		await this.sidenoteProcessor.delete(sidenote);

		this.styler.updateDecorations();
	}

	async prune(category) {
		this.scanDocumentAnchors();

		switch (category) {
			case 'broken': await this.pruner.pruneBroken(); break;
			case 'empty': await this.pruner.pruneEmpty(); break;
			default: await this.pruner.pruneAll();
		}

		this.styler.updateDecorations();
	}

	reset() {
		this.styler.decReset();
		this.pool.clear();
	}

	async migrate() {
		// только для FileService
		// TODO если используется другой тип StoragService, не регистрируем эту команду просто

		// TODO вынести в класс userInteractions
		const options: vscode.OpenDialogOptions = {
			canSelectMany: false,
			canSelectFolders: true,
			// defaultUri: this.getCurrentWorkspacePath() //TODO default URI
			openLabel: 'Select folder to look for missing sidenotes',
			// filters: {
			// 	'Text files': ['txt'],
			// 	'All files': ['*']
			// }
		};

		//TODO try to read files for all sidenotes and report statictics if there are ny broken sidenotes

		const lookupUri = await vscode.window.showOpenDialog(options);
		if (!lookupUri) return;

		const ids = Array.from(await this.scanner.scanCurrentWorkspace());

		// TODO build sidenote instances from ids to check if they are broken

		const results = await Promise.all(
			ids.map(async id => {
				return this.sidenoteProcessor.storageService.lookup!(id, lookupUri[0].fsPath);
			})
		);
		const successfulResults = results.filter(result => result); // TODO map to just file names
		const message = successfulResults.length === 0 ?
			'No missing files were found in specified directory ' :
			`The following files have been found and copied to the current workspace:
			${successfulResults.join(',\n')}`;
		vscode.window.showInformationMessage(message);


	}

	async cleanExtraneous() { //TODO
		// только для FileService
		// const ids = await this.scanner.scanCurrentWorkspace();
		// const sidenoteFiles = await this.scanner.scanCurrentSidenotesDir();
		// sidenoteFiles.forEach(filepath => {
		// 	const id = getIdFromFilename(filepath);
		// 	if(!ids.has(id)) sidenoteProcessor.storageService.delete(id);
		// })
	}

	async internalize() {
		// TODO comment regexp match document for content, select and toggle comment)
		if (!vscode.window.activeTextEditor) return;
		const scanData = this.scanner.scanLine();
		if (!scanData) {
			vscode.window.showInformationMessage('There is no sidenotes attached at current cursor position');
			return;
		}
		const sidenote = await this.sidenoteProcessor.getOrCreate(scanData);
		const content = sidenote.content;
		if (content) {
			await this.sidenoteProcessor.delete(sidenote);
			await vscode.window.activeTextEditor.edit(
				edit => { edit.insert(vscode.window.activeTextEditor!.selection.anchor, content); },
				{ undoStopAfter: false, undoStopBefore: false }
			);
		}
		// TODO get range for comment toggle comment

		this.styler.updateDecorations();
	}
}
