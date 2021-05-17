import { EditorUtils, MarkerUtils } from './utils';
import { Range, TextEditor } from 'vscode';

import { DecorableDecoration } from './decorator';
import Scanner from './scanner';

// 🕮 <cyberbiont> f58ba286-a09a-42d1-8bbf-a3bda39ccafa.md
export interface Anchor {
	marker: string;
}
export interface Anchorable {
	id: string;
	anchor: Anchor;
	content?: string;
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

	getAnchor(uuid: string, extension?: string): Anchor {
		return {
			marker: this.utils.getMarker(uuid, extension),
		};
	}

	// 🕮 <cyberbiont> ea500e39-2499-4f4c-9f71-45a579bbe7af.md
	async write(anchorable: Anchorable, ranges: Range[]): Promise<void> {
		// 🕮 <cyberbiont> be351e3b-e84f-4aa8-9f6e-a216550300d9.md
		process.env.SIDENOTES_LOCK_EVENTS = `true`;

		const writeRangeInChain = async (range: Range) =>
			this.writeRange(anchorable, range);

		for (const [i, range] of ranges.entries()) {
			// eslint-disable-next-line no-await-in-loop
			await writeRangeInChain(range);
		}
		delete process.env.SIDENOTES_LOCK_EVENTS;
	}

	/**
	 * writes anchor comment to document at current cursor position
	 */
	private async writeRange(
		anchorable: Anchorable,
		range: Range,
		editor = this.editor,
	): Promise<boolean> {
		await editor.edit(
			edit => edit.insert(range.start, anchorable.anchor.marker),
			{ undoStopAfter: false, undoStopBefore: false },
		);
		return this.utils.toggleComment(range, editor, {
			useBlockComments: this.cfg.anchor.comments.useBlockComments,
		});
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
			return this.deleteRange(range);
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

	private async deleteRange(
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

	// old 🕮 <cyberbiont> 889a4671-a154-4c3c-95f5-abf72fb5b8aa.md
}
