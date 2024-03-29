import { EditorUtils, MarkerUtils } from './utils';
import { Range, TextEditor } from 'vscode';

import { DecorableDecoration } from './decorator';
import Scanner from './scanner';
import { Sidenote } from './sidenote';

// 🕮 <cyberbiont> f58ba286-a09a-42d1-8bbf-a3bda39ccafa.md
export interface Anchorable {
	// 🕮 <cyberbiont> c2ae3978-3d5e-466a-807e-50188962dcd9.md
	marker: string;
	id: string;
}

export type OAnchorer = {
	anchor: {
		comments: {
			useBlockComments?: boolean;
			cleanWholeLine: boolean;
			// affectNewlineSymbols: boolean
		};
	};
};

export default class Anchorer {
	constructor(
		private editor: TextEditor,
		private utils: EditorUtils & MarkerUtils,
		public scanner: Scanner,
		public cfg: OAnchorer,
	) {}

	// <cyberbiont> ea500e39-2499-4f4c-9f71-45a579bbe7af.md
	async write(anchorable: Anchorable, ranges: Range[]): Promise<void> {
		// TODO <cyberbiont> be351e3b-e84f-4aa8-9f6e-a216550300d9.md
		process.env.SIDENOTES_LOCK_EVENTS = `true`;

		const writeRangeInChain = async (range: Range) =>
			this.writeMarkerRange(anchorable, range);

		for (const range of ranges) {
			// eslint-disable-next-line no-await-in-loop
			await writeRangeInChain(range);
		}
		delete process.env.SIDENOTES_LOCK_EVENTS;
	}

	/**
	 * writes anchor comment to document at current cursor position
	 */
	private async writeMarkerRange(
		anchorable: Anchorable,
		range: Range,
		editor = this.editor,
	): Promise<boolean> {
		await editor.edit(edit => edit.insert(range.start, anchorable.marker), {
			undoStopAfter: false,
			undoStopBefore: false,
		});
		return this.utils.toggleComment(range, editor, {
			useBlockComments: this.cfg.anchor.comments.useBlockComments,
		});
	}

	private async deleteMarkerRange(
		range: Range,
		editor = this.editor,
	): Promise<boolean> {
		let rangeToDelete: Range;

		if (!this.cfg.anchor.comments.useBlockComments) {
			// just delete the whole line
			rangeToDelete = this.utils.extendRangeToFullLine(range);
			// 🕮 <cyberbiont> 04489f5c-ef73-4c4d-a40b-d7d824ebc9db.md
		} else {
			await this.utils.toggleComment(range, editor, {
				useBlockComments: this.cfg.anchor.comments.useBlockComments,
			});

			// we have to re-calculate range after the comment toggle
			rangeToDelete = this.rescanLine(range);
		}

		return editor.edit(
			edit => {
				edit.delete(rangeToDelete);
			},
			{ undoStopAfter: false, undoStopBefore: false },
		);
		// internalization 🕮 <cyberbiont> 07fb08db-1c38-4376-90c2-72ca16623ff5.md
	}

	async replaceSignature(
		sidenote: Sidenote,
		newSignature: string,
		editor = this.editor,
	) {
		const signatureRanges = sidenote.ranges.map(range =>
			this.utils.getMarkerSubRange(
				range.start,
				sidenote.marker,
				sidenote.signature,
			),
		);

		for (const range of signatureRanges) {
			// eslint-disable-next-line no-await-in-loop
			await editor.edit(
				edit => {
					edit.delete(range);
				},
				{ undoStopAfter: false, undoStopBefore: false },
			);
			// eslint-disable-next-line no-await-in-loop
			await editor.edit(edit => edit.insert(range.start, newSignature), {
				undoStopAfter: false,
				undoStopBefore: false,
			});
		}

		sidenote.marker = sidenote.marker.replace(sidenote.signature, newSignature);
		sidenote.signature = newSignature;
	}

	async delete(
		anchored: Anchorable & { decorations: DecorableDecoration[] },
		internalize?: false,
	): Promise<void> {
		// process.env.SIDENOTES_LOCK_EVENTS = 'true';
		const ranges = Array.from(
			new Set(anchored.decorations.map(decoration => decoration.options.range)),
		);

		const deleteRangeInChain = async (
			range: Range,
			i: number,
		): Promise<boolean> => {
			if (i !== 0) {
				const regexp = new RegExp(
					this.utils.getBareMarkerRegexString(anchored.id),
				);
				const nextRange = this.scanner.rescanForRange(regexp);

				if (!nextRange)
					throw new Error(
						`next anchor marker not found when tryin to rescan for range after previous marker deletion `,
					);

				range = this.utils.extendRangeToFullLine(nextRange);
			}
			return this.deleteMarkerRange(range);
		};

		for (const [i, range] of ranges.entries()) {
			// eslint-disable-next-line no-await-in-loop
			await deleteRangeInChain(range, i);
		}

		// delete process.env.SIDENOTES_LOCK_EVENTS;
	}

	private rescanLine(range: Range): Range {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return this.scanner.scanLine(this.utils.getTextLine(range.start))!
			.ranges[0];
	}
}
