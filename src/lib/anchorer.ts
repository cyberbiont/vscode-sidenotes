import * as vscode from 'vscode';
import {
	EditorUtils,
	IStylableDecoration,
	MarkerUtils,
	Scanner,
} from './types';

// 🕮 f58ba286-a09a-42d1-8bbf-a3bda39ccafa

export interface IAnchor {
	marker: string;
	editor: vscode.TextEditor;
}
export interface IAnchorable {
	anchor: IAnchor;
	content: string | undefined;
}

export type OAnchorer = {
	anchor: {
		comments: {
			useBlockComments ?: boolean
			cleanWholeLine: boolean,
			// affectNewlineSymbols: boolean
		}
	}
};

export default class Anchorer {

	constructor(
		private editor: vscode.TextEditor,
		private utils: EditorUtils & MarkerUtils,
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

	// 🕮 ea500e39-2499-4f4c-9f71-45a579bbe7af
	async write(anchorable: IAnchorable, ranges: vscode.Range[]): Promise<void> {

		const iterator = this.editsChainer(ranges, this.writeRange.bind(this, anchorable));
		for await(let range of iterator);
	}

	/**
	* writes anchor comment to document at current cursor position
	*/
	private async writeRange(anchorable: IAnchorable, range: vscode.Range) {
		const selection = anchorable.anchor.editor.selection;

		await anchorable.anchor.editor.edit(
			edit => edit.insert(range.start, anchorable.anchor.marker),
			{ undoStopAfter: false, undoStopBefore: false }
		);
		await this.utils.toggleComment(
			range,
			anchorable.anchor.editor,
			{ useBlockComments: this.cfg.anchor.comments.useBlockComments }
		);
	};

	async delete(anchored: IAnchorable & { decorations: IStylableDecoration[] }, internalize?: false): Promise<void> {
		const ranges = Array.from(new Set(
			anchored.decorations.map(decoration => decoration.options.range)
		));

		const iterator = this.editsChainer(
			ranges,
			range => this.deleteRange.call(this, anchored, range, internalize)
			// this.deleteRange.bind(this, anchored)
		);

		for await(let range of iterator);
	}

	private async deleteRange(anchored: IAnchorable, range: vscode.Range) {
		let rangeToDelete: vscode.Range;
		const editor = anchored.anchor.editor;

		if (!this.cfg.anchor.comments.useBlockComments) {
			// just delete the whole line
			rangeToDelete = this.utils.getTextLine(range.start).range;

			// 🕮 04489f5c-ef73-4c4d-a40b-d7d824ebc9db
		} else {
			await this.utils.toggleComment(
				range,
				editor,
				{ useBlockComments: this.cfg.anchor.comments.useBlockComments }
			);
			// re-calculate range after comment toggle
			const commentedRange = this.scanner.scanLine(
				this.utils.getTextLine(range.start)
			)!.ranges[0];
			rangeToDelete = commentedRange;
		}

		await editor.edit(
			edit => { edit.delete(rangeToDelete); },
			{ undoStopAfter: false, undoStopBefore: false }
		);
		// internalization 🕮 07fb08db-1c38-4376-90c2-72ca16623ff5

		return;
	}

	private async *editsChainer(iterable, cb) {
		for (let item of iterable) yield cb.call(this, item);
	}
}
