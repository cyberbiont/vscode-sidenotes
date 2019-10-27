import * as vscode from 'vscode';
import Scanner, { IScanResultData } from './scanner';
import { ISidenote } from './sidenote';
import Pruner from './pruner';
import SidenoteProcessor from './sidenoteProcessor';
import Styler from './styler';
import { IDictionary } from './dictionary';

export default class Commands {
	constructor(
		private styler: Styler<ISidenote>,
		private pruner: Pruner,
		private sidenoteProcessor: SidenoteProcessor,
		private scanner: Scanner,
		private pool: IDictionary<ISidenote>
	) {
		this.scanner = scanner;
		this.styler = styler;
		this.pruner = pruner;
		this.sidenoteProcessor = sidenoteProcessor;
		this.pool = pool;
	}

	/**
	*  scans current document, registers sidenotes and activates comments decorations
	*  should be called on extension activation and changes of active editor
	*/
	async initAnchors(): Promise<void> {
		try {
			const scanResults = this.scanner.getIdFromText();
			if (!scanResults) {
				vscode.window.showInformationMessage('no sidenotes found in current document');
				return;
			}

			const recreate = async (scanResult): Promise<ISidenote> => {
				let sidenote = await this.sidenoteProcessor.get(scanResult);
				return sidenote;
			}
			await scanResults.forEach(recreate, this);

			this.styler.updateDecorations();

		} catch(e) {;
			console.log(e);
		}
	}

	async run(): Promise<void> {
		try {
			const scanResult = this.scanner.getFromCurrentLine();
			// if (scanResult) { const { id, markerStartPos } = scanResult; }
			let sidenote = await this.sidenoteProcessor.get(scanResult);
			await this.sidenoteProcessor.open(sidenote);

			this.styler.updateDecorations();
		} catch(e) {;
			console.log(e);
		}
	}

	async delete(): Promise<void> {
		const scanResult = this.scanner.getFromCurrentLine();
		if (!scanResult) {
			vscode.window.showInformationMessage('There is no sidenotes attached at current cursor position');
			return;
		}

		const sidenote = await this.sidenoteProcessor.get(scanResult);
		await this.sidenoteProcessor.delete(sidenote);

		this.styler.updateDecorations();
	}

	async prune(category) {
		this.initAnchors();

		switch (category) {
			case 'broken': await this.pruner.pruneBroken(); break
			case 'empty': await this.pruner.pruneEmpty(); break;
			default: await this.pruner.pruneAll();
		}

		this.styler.updateDecorations();
	}

	temp() {
		this.styler.decReset();
		this.pool.clear();
	}

	// checkForOrphanedSidenotes() {}  //TODO
	// migrate(targetFolder: string) {} //TODO
	// findAnchorsInCurrentRoot(path): string {
	// }
	// findAnchorsInDirectory() { //TODO: add to explorer context menu
	// 	fs.readdirSync(target dir). for each => content.match(sidenote.regexp) -> recreate sidenotes -> foreach fs.modeFile(sidenote.path, {didenotes.subfolder}targetdir)
	// }

	//TODO unit tests

	async internalize() {
		// TODO comment regexp match document for content, select and toggle comment)
		if (!vscode.window.activeTextEditor) return
		const scanResult = this.scanner.getFromCurrentLine();
		if (!scanResult) {
			vscode.window.showInformationMessage('There is no sidenotes attached at current cursor position');
			return;
		}
		const sidenote = await this.sidenoteProcessor.get(scanResult);
		const content = sidenote.content;
		if (content) {
			await this.sidenoteProcessor.delete(sidenote);
			await vscode.window.activeTextEditor.edit(
				edit => { edit.insert(vscode.window.activeTextEditor!.selection.anchor, content); },
				{ undoStopAfter: false, undoStopBefore: false }
			);
		}
		this.styler.updateDecorations();
	}
}
