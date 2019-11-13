import * as vscode from 'vscode';
import {
	ActiveEditorUtils,
	Anchorer,
	Designer,
	IAnchor,
	IAnchorable,
	IDesignable,
	IIdMaker,
	MarkerUtils,
	IScanData,
	IStorable,
	IStorageService,
	IStylable,
	IStylableDecorations,
	Scanner,
	// IPrunable
} from './types';

export interface ISidenote
	extends
		IDesignable,
		IStylable,
		IAnchorable
		// IPrunable,
		// IStorable,
	{
		id: string
	}

export class Sidenote implements ISidenote {
	id: string
	content: string|undefined
	anchor: IAnchor
	decorations: IStylableDecorations
	constructor(
		sidenote: ISidenote,
	) {
		Object.assign(this, sidenote);
	}
	// isBroken(): boolean { return typeof this.content === 'undefined'; }
	// isEmpty(): boolean { return this.content === ''; }
}

export class Inspector {
	isBroken(sidenote): boolean { return typeof sidenote.content === 'undefined'; }
	isEmpty(sidenote): boolean { return sidenote.content === ''; }
}
// TODO оставить отдельным классом (можно переименовать в stats), но вложить в sidenote

export class SidenoteBuilder implements Partial<Sidenote> {
	// works even without making all properties optional
	id?: string
	anchor?: IAnchor
	content?: string|undefined
	decorations?: IStylableDecorations

	withId(id: string): this & Pick<Sidenote, 'id'> {
		return Object.assign(this, { id });
	}

	withAnchor(anchor: IAnchor): this & Pick<Sidenote, 'anchor'> {
		return Object.assign(this, { anchor });
	}

	withContent(content: string|undefined): this & Pick<Sidenote, 'content'> {
		return Object.assign(this, { content });
	}

	withDecorations(decorations: IStylableDecorations): this & Pick<Sidenote, 'decorations'> {
		return Object.assign(this, { decorations });
	}

	build(this: Sidenote) {
		return new Sidenote(this);
	}
}

export class SidenoteFactory {
	constructor(
		private idMaker: IIdMaker,
		private anchorer: Anchorer,
		private storageService: IStorageService,
		private designer: Designer,
		private activeEditorUtils: ActiveEditorUtils,
		private markerUtils: MarkerUtils,
		private scanner: Scanner,
		private SidenoteBuilder
	) {}

	async build(scanData?: IScanData): Promise <ISidenote> {

		let id: string;
		let ranges: vscode.Range[];
		let sidenote: ISidenote;
		// let position: vscode.Position;

		if (!scanData) { // buildNewSidenote
			id = this.idMaker.makeId();
			const undecorated = new SidenoteBuilder()
				.withId(id)
				.withContent(await this.activeEditorUtils.extractSelectionContent())
				.withAnchor(this.anchorer.getAnchor(id));
			/* cannot generate decoration with proper range before write method,
			because comment toggling changes range and it may vary with language,
			so regexp rescan is needed inside designer(we can limit it to current line based on position) */
			const position = undecorated.anchor.editor.selection.anchor;
			let range = this.markerUtils.getMarkerRange(undecorated.anchor, position);
			const promises =	await Promise.all([
				this.storageService.write(undecorated as IStorable),
				this.anchorer.write(undecorated, [range])
			]);
			// await this.anchorer.write(undecorated, [range]);
			// re-calculate range after comment toggle
			({ ranges } = this.scanner.scanLine(
				this.activeEditorUtils.getTextLine(range.start)
			)!);

			return sidenote = undecorated.withDecorations(this.designer.get(undecorated, ranges))
				.build();

		} else {
			({ id, ranges } = scanData);
			const storageEntry = this.storageService.get(id);
			const content = storageEntry ? storageEntry.content : undefined;
			const undecorated = new SidenoteBuilder()
				.withId(id)
				.withContent(content)
				.withAnchor(this.anchorer.getAnchor(id));

			return sidenote = undecorated.withDecorations(
				this.designer.get(undecorated, ranges)
				)
				.build();
		}
	}
}
