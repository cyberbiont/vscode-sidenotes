import * as vscode from 'vscode';
import {
	EditorUtils,
	IDecorableDecoration,
	MarkerUtils,
	Scanner,
} from './types';

// 🕮 <YL> f58ba286-a09a-42d1-8bbf-a3bda39ccafa.md
export interface IAnchor {
	marker: string;
}
export interface IAnchorable {
	id: string,
	anchor: IAnchor;
	content?: string;
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

	getAnchor(uuid: string, extension?: string): IAnchor {
		return {
			marker: this.utils.getMarker(uuid, extension),
		};
	}

	// 🕮 <YL> ea500e39-2499-4f4c-9f71-45a579bbe7af.md
	async write(anchorable: IAnchorable, ranges: vscode.Range[]): Promise<void> {
		const iterator = this.editsChainer(
			ranges,
			// this.writeRange.bind(this, anchorable)
			async (range: vscode.Range, i: number) => {
				// if (i > 0) {
				// 	// range = this.editor.getText().match(...)
				// }
				return this.writeRange.call(this, anchorable, range)
			}
		);
		for await(let range of iterator);
	}

	/**
	* writes anchor comment to document at current cursor position
	*/
	private async writeRange(anchorable: IAnchorable, range: vscode.Range, editor = this.editor) {
		// const selection = editor.selection;

		await editor.edit(
			edit => edit.insert(range.start, anchorable.anchor.marker),
			{ undoStopAfter: false, undoStopBefore: false }
		);
		await this.utils.toggleComment(
			range,
			editor,
			{ useBlockComments: this.cfg.anchor.comments.useBlockComments }
		);
	};

	async delete(anchored: IAnchorable & { decorations: IDecorableDecoration[] }, internalize?: false): Promise<void> {
		const ranges = Array.from(new Set(
			anchored.decorations.map(decoration => decoration.options.range)
		));

		const iterator = this.editsChainer(
			ranges,
			async (range: vscode.Range, i: number) => {
				if (i != 0) {
					const regexp = new RegExp(this.utils.getBareMarkerRegexString(anchored.id));
					const nextRange = this.scanner.rescanForRange(regexp);

					if (!nextRange) return;
					else {
						range = this.utils.extendRangeToFullLine(nextRange);
					}
				}
				return this.deleteRange.call(this, anchored, range, internalize)
			}
		);

		for await(let range of iterator);
	}

	private async deleteRange(anchored: IAnchorable, range: vscode.Range, editor = this.editor) {
		let rangeToDelete: vscode.Range;

		if (!this.cfg.anchor.comments.useBlockComments) {
			// just delete the whole line
			rangeToDelete = this.utils.extendRangeToFullLine(range);
			// 🕮 <YL> 04489f5c-ef73-4c4d-a40b-d7d824ebc9db.md
		} else {
			await this.utils.toggleComment(
				range,
				editor,
				{ useBlockComments: this.cfg.anchor.comments.useBlockComments }
			);

			// we have to re-calculate range after comment toggle
			const [ commentedRange ] = this.scanner.scanLine(
				this.utils.getTextLine(range.start)
			)!.ranges;

			rangeToDelete = commentedRange;
		}

		await editor.edit(
			edit => { edit.delete(rangeToDelete); },
			{ undoStopAfter: false, undoStopBefore: false }
		);
		// internalization 🕮 <YL> 07fb08db-1c38-4376-90c2-72ca16623ff5.md

		return;
	}

	private async *editsChainer(iterable: vscode.Range[], cb) {
		for (let [i, item] of iterable.entries()) yield cb.call(this, item, i);
		// for (let item of iterable) yield cb.call(this, item);
	}
}
