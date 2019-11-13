import * as vscode from 'vscode';
import {
	ActiveEditorUtils,
	IStylableDecorations,
	MarkerUtils,
	Scanner
} from './types';

/* 2 возможных подхода (действуем аналогично со storage и content):
- если прописывать anchor в объект только после того, как коммент был уже вписан
наличие anchor т.о. дает возможность определить по объекту, что для него был прописан коммент
таким же образом наличие св-ва контент могло бы означать, что существует соответствуюший файл
Минусы: не можем отделить билдинг объекта от его персистенса.
Т.е. придется либо сразу же персистировать при билдинге, что не позволит нам например
использовать протокол undefined при открытии файла
либо делать св-ва content и anchor опциональными (что не есть хорошо)
// getInitialContent придется выполнять в модуле storage, т.к. если мы его получим при билдинге объекта, его негде будет хранить,
 пока не пропишем content в объекте...

 Подход 2. создавать все св-ва объекта до персистирования, но ставить флагиЖ внутри anchor - anchored: false
 и stored-false для контента. При персистировании, если нужно, переводим их в состояние true
 при сканировании если видим анкор можем сразу поставить true
 Тогда broken может определяться как anchored === true & stored === false

 причем добавлением этих св-в вероятно должен заниматься не anchorer и storage
- */

export interface IAnchor {
	marker: string;
	editor: vscode.TextEditor;
	// positions: vscode.Position[]
}
export interface IAnchorable {
	anchor: IAnchor;
}

export type OAnchorer = {
	anchor: {
		marker: {
			useMultilineComments ?: boolean
		}
	}
};

export default class Anchorer {
	constructor(
		public markerUtils: MarkerUtils,
		public activeEditorUtils: ActiveEditorUtils,
		public scanner: Scanner,
		public cfg: OAnchorer
	) {}

	getAnchor(id: string,
		// positions: vscode.Position[]
		): IAnchor {
		return {
			editor: this.activeEditorUtils.editor,
			marker: this.markerUtils.getMarker(id),
			// positions
		};
	}

	/**
	* creates anchor comment to document at current cursor position
	*/
	// сделаем Anchorable аргументаом, а не anchor, по аналогии со Storage, который принимает writable
	// но по сути storage сам определяет место хранения на основании id,
	// соответственно write тоже должен рассчитывать range(по сути место хранения) на основании анкора
	//  то он в принципе и делает (определяет position) по положению курсора;
	// вернем position чтобы его могла использовать дизайнер для опрделения рэнджа
	async write(anchorable: IAnchorable, ranges: vscode.Range[]): Promise<void> {

		const writeRange = async range => {
			const selection = anchorable.anchor.editor.selection;
			console.log(this);

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

		// const ranges = this.markerUtils.getMarkerRange(anchored.anchor);
		const ranges = Array.from(new Set(
			anchored.decorations.map(decoration => decoration.options.range)
		));

		// после каждого удаления range надо вычислять по-новой, т.к. происходит смещение линий.


		const deleteRange = async range => {
			let rangeToDelete: vscode.Range;

			if (!this.cfg.anchor.marker.useMultilineComments) {
				// just delete the whole line
				// rangeToDelete = this.activeEditorUtils.getTextLine(range.start).rangeIncludingLineBreak;
				rangeToDelete = this.activeEditorUtils.getTextLine(range.start).range;
				// если мы удаляем также линию, ( используем rangeIncludingLineBreak)
				// то после каждого удаления range надо вычислять по-новой, т.к. происходит смещение линий.
				//  или у номера каждой линии в ranges у которой значение больше, чему  удаленной, отнимать 1
				// лучше соблюдать консистентность, т.е. если в write не добаляем новую строку, то и в delete не удаляем
				// можно это сделать опцией

			} else {
				await this.toggleComment(anchored.anchor, range);
				// re-calculate range after comment toggle
				const commentedRange = this.scanner.scanLine(
					this.activeEditorUtils.getTextLine(range.start)
				)!.ranges[0];
				rangeToDelete = commentedRange;
			}
			return anchored.anchor.editor.edit(
				edit => { edit.delete(rangeToDelete); },
				{ undoStopAfter: false, undoStopBefore: false }
			);
		}

		const iterator = this.editsChainer(ranges, deleteRange);
		// for await(let range of ranges) await deleteRange(range);
		for await(let range of iterator);

	}

	private async toggleComment(
		anchor: IAnchor,
		range: vscode.Range
	): Promise<boolean> {
		try {
			const selection = new vscode.Selection(range.start, range.end);
			anchor.editor.selection = selection;
			if (this.cfg.anchor.marker.useMultilineComments) {
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
