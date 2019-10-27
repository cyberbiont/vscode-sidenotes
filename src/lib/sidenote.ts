import * as vscode from 'vscode';
import { IStylable, IStylableDecorations } from './styler';
// import { IPrunable } from './pruner';
import Designer, { IDesignable } from './designer';
import { IIdMaker } from './idMaker';
import Anchorer, { IAnchorable, IAnchor} from './anchorer';
import { IStorable, IStorageService } from './storageService';
import { ActiveEditorUtils } from './utils';


export enum CreationScenario {	new, init, edit }

export interface ISidenote
	extends
		IDesignable,
		IStorable,
		IStylable,
		IAnchorable
		// IPrunable
	{}

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

export class SidenoteBuilder implements Partial<Sidenote> {
	// TODO а что если сделать обязательными (попробовать)
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
		private SidenoteBuilder
	) {
		this.idMaker = idMaker;
		this.anchorer = anchorer;
		this.storageService = storageService;
		this.designer = designer;
		this.activeEditorUtils = activeEditorUtils;
		this.SidenoteBuilder = SidenoteBuilder;
	}

	async build(predefinedId: string|null, markerStartPos?: vscode.Position): Promise <ISidenote> {

		let id: string;
		let sidenote: ISidenote;

		if (!predefinedId) { // buildNewSidenote
			id = this.idMaker.makeId();
			const undecorated = new SidenoteBuilder()
				.withId(id)
				.withContent(await this.activeEditorUtils.extractSelectionContent())
				.withAnchor(this.anchorer.getAnchor(id));
			/* cannot generate decoration with proper range before write method,
			because comment toggling changes range and it may vary with language,
			so regexp rescan is needed inside designer(we can limit it to current line based on position) */
			const writeResults = await Promise.all([
				this.storageService.write(undecorated),
				this.anchorer.write(undecorated)
			]);
			let uncommentedMarkerStartPos = writeResults[1];
			return sidenote = undecorated.withDecorations(this.designer.get(undecorated, { uncommentedMarkerStartPos }))
				.build();

		} else {
			id = predefinedId;
			const undecorated = new SidenoteBuilder()
				.withId(id)
				.withContent(this.storageService.get(id).content)
				.withAnchor(this.anchorer.getAnchor(id));
			// markerStartPos может быть undefined при глобальном сканировании
			return sidenote = undecorated.withDecorations(this.designer.get(undecorated, { markerStartPos }))
				.build();
		}

		// const draftDesignable = new SidenoteBuilder()
		// 	.withId(id)

		// 	.withContent(buildNewSidenote ?
		// 		await this.activeEditorUtils.extractSelectionContent() :
		// 		this.storageService.get(id).content
		// 	)

		// 	.withAnchor(this.anchorer.getAnchor(id)); // используем id, для консистентности с get content
		// // cannot generate decoration with proper range before write method,
		// // because comment toggling changes range and it may vary with language,
		// //  so regexp rescan is needed inside designer(we can limit it to current line based on position)

		// const markerStartPos = buildNewSidenote ?
		// 	markerStartPos :
		// 	await this.anchorer.write(draftDesignable);

		// const sidenote =
		// 	draftDesignable.withDecorations(this.designer.get(draftDesignable, markerStartPos))
		// 	.build();

		// return sidenote;
	}
}



/* interface IUsebleInX {
	x: number
}
interface IUsebleInY {
	y: number
}

interface IPoint {
	x: number
	y: number
	z?: number
}

class Point implements IPoint  {
	x: number
	y: number
	z?: number
	constructor(point: Point) {
		Object.assign(this, point);
	}
} */

// function isIAble(draft): draft is IAble {
// 	return (draft as IAble).x !== undefined;
// }

/* class PointBuilder implements Partial<Point> {
	x?: number;
	y?: number;
	z?: number;

	withX(value: number): this & Pick<Point, 'x'> {
	// withX(value: number): IAble {
		return Object.assign(this, { x: value });
	}

	withY(value: number): this & Pick<Point, 'y'> {
		return Object.assign(this, { y: value });
	}

	withZ(value: number): this & Required<Pick<Point, 'z'>> {
		return Object.assign(this, { z: value });
	}

	build(this: Point) {
		return new Point(this);
	}
}

const point = new PointBuilder()
	.withX(1)
	.withY(1)
	.build()

const draft = new PointBuilder()

const draftX = draft.withX(1);
x(draftX);

const draftY = draftX.withY(2);
y(draftY);

function x(input: IUsebleInX) {	console.log(input); }
function y(input: IUsebleInY) {	console.log(input); }
 */
