import * as vscode from 'vscode';
import {
	MarkerUtils,
	ActiveEditorUtils,
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
	marker: string
	editor: vscode.TextEditor,
	// positions: vscode.Position[]
}
export interface IAnchorable {
	anchor: IAnchor
}

export type OAnchorer = {
	anchor: {
		marker: {
			useMultilineComments ?: boolean
		}
	}
}

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
		}
	}

	/**
	* creates anchor comment to document at current cursor position
	*/
	// сделаем Anchorable аргументаом, а не anchor, по аналогии со Storage, который принимает writable
	// но по сути storage сам определяет место хранения на основании id,
	// соответственно write тоже должен рассчитывать range(по сути место хранения) на основании анкора
	//  то он в принципе и делает (определяет position) по положению курсора;
	// вернем position чтобы его могла использовать дизайнер для опрделения рэнджа
	async write(anchorable: IAnchorable): Promise<vscode.Position> {
		// if (anchorable.hasAnchor()) return anchorable; // if file already has anchor, no need to write it
		// const anchorData = this.getAnchorData(anchorable.id);
		const selection = anchorable.anchor.editor.selection;
		const markerStartPos = selection.anchor;
		// position is current cursor position

		await anchorable.anchor.editor.edit(
			edit => {
				edit.insert(markerStartPos, anchorable.anchor.marker);
				// if (!this.cfg.anchor.marker.useMultilineComments) {
				// 	// const line = selection.active.line.range.end;
				// 	// edit.insert(selection.end, '\xa0');
				// }
			},
			{ undoStopAfter: false, undoStopBefore: false }
		);

		const range = this.markerUtils.getMarkerRange(anchorable.anchor, markerStartPos);
		await this.toggleComment(anchorable.anchor, range);

		return markerStartPos;
	}

	async delete(anchored: IAnchorable): Promise<void> {
		// вычисляем range по новой т.к. после тоггла коммента позиция сместилась
		const ranges = this.markerUtils.getMarkerRange(anchored.anchor);

		const deleteRange = async range => {

			let rangeToDelete: vscode.Range;

			if (!this.cfg.anchor.marker.useMultilineComments) {
				rangeToDelete = this.activeEditorUtils.getTextLine(range.start).rangeIncludingLineBreak;
			} else {
				await this.toggleComment(anchored.anchor, range);
				const commentedRange = this.scanner.rescanLineForMarkerRange(anchored.anchor, range.start);
				rangeToDelete = commentedRange;
			}
			return anchored.anchor.editor.edit(
				edit => { edit.delete(rangeToDelete); },
				{ undoStopAfter: false, undoStopBefore: false }
			);
		}

		ranges[Symbol.asyncIterator] = async function* () {
			for (const range of this) { yield deleteRange(range); }
		};

		for await (let range of ranges) {
			// await deleteRange(range);
		}
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
			return false
		}
	}
}
