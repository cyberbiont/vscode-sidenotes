import * as vscode from 'vscode';
import {
	IStylableDecorations,
	Scanner,
	MarkerUtils,
} from './types';

// 🕮 f58ba286-a09a-42d1-8bbf-a3bda39ccafa

export interface IAnchor {
	marker: string;
	editor: vscode.TextEditor;
}
export interface IAnchorable {
	anchor: IAnchor;
}

export type OAnchorer = {
	anchor: {
		comments: {
			useBlockComments ?: boolean
			cleanWholeLine: boolean,
			affectNewlineSymbols: boolean
		}
	}
};

export default class Anchorer {
	constructor(
		private editor: vscode.TextEditor,
		private utils: MarkerUtils,
		public scanner: Scanner,
		public cfg: OAnchorer
	) {}

	getAnchor(id: string,
		): IAnchor {
		return {
			editor: this.editor,
			marker: this.utils.getMarker(id),
		};
	}

	/**
	* creates anchor comment to document at current cursor position
	*/
	// 🕮 ea500e39-2499-4f4c-9f71-45a579bbe7af
	async write(anchorable: IAnchorable, ranges: vscode.Range[]): Promise<void> {

		const writeRange = async range => {
			const selection = anchorable.anchor.editor.selection;

			await anchorable.anchor.editor.edit(
				edit => edit.insert(range.start, anchorable.anchor.marker),
				{ undoStopAfter: false, undoStopBefore: false }
			);

			await this.toggleComment(anchorable.anchor, range);
		};

		const iterator = this.editsChainer(ranges, writeRange);
		// for await(let range of ranges)  await writeRange(range);
		for await(let range of iterator);

	}

	async delete(anchored: IAnchorable & { decorations: IStylableDecorations }): Promise<void> {
		const ranges = Array.from(new Set(
			anchored.decorations.map(decoration => decoration.options.range)
		));

		const deleteRange = async range => {
			let rangeToDelete: vscode.Range;

			if (!this.cfg.anchor.comments.useBlockComments) {
				// just delete the whole line
				rangeToDelete = this.editor.document.lineAt(range.start).range;
				// rangeToDelete = this.utils.getTextLine(range.start).range;
				// 🕮 04489f5c-ef73-4c4d-a40b-d7d824ebc9db
			} else {
				await this.toggleComment(anchored.anchor, range);
				// re-calculate range after comment toggle
				const commentedRange = this.scanner.scanLine(
					// this.utils.getTextLine(range.start)
					this.editor.document.lineAt(range.start)
				)!.ranges[0];
				rangeToDelete = commentedRange;
			}
			return anchored.anchor.editor.edit(
				edit => { edit.delete(rangeToDelete); },
				{ undoStopAfter: false, undoStopBefore: false }
			);
		}

		const iterator = this.editsChainer(ranges, deleteRange);
		for await(let range of iterator);
	}

	private async toggleComment(
		anchor: IAnchor,
		range: vscode.Range
	): Promise<boolean> {
		try {
			const selection = new vscode.Selection(range.start, range.end);
			anchor.editor.selection = selection;
			if (this.cfg.anchor.comments.useBlockComments) {
				await vscode.commands.executeCommand('editor.action.blockComment');
			} else {
				await vscode.commands.executeCommand('editor.action.commentLine');
			}
			return true;
		} catch (e) {
			return false;
		}
	}

	private async *editsChainer(iterable, cb) {
		for (let item of iterable) yield cb.call(this, item);
	}
}
