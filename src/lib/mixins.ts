import * as vscode from 'vscode';
import {
	Constructor,
	Mixin,
	IDictionary,
	ISidenote
} from './types';

export interface HasState {
	state: boolean
	setState(value: boolean): boolean
	getState(): boolean
	toggleState(): boolean
}

export function HasState<T extends Constructor>(Base: T) {
	return class extends Base {
		private state: boolean = false;

		setState(value: boolean): boolean {
			return this.state = value;
		}
		getState(): boolean {
			return this.state;
		}
		toggleState(): boolean {
			return this.state = !this.state;
		}
	};
}

export type Initializable = Mixin<typeof Initializable>
export function Initializable<T extends Constructor>(Base: T) {
	return class Initializable extends Base {
		public isInitialized: boolean = false;
	};
}

export type HasParentDocument = Mixin<typeof HasParentDocument>
export function HasParentDocument<T extends Constructor>(Base: T) {
	return class HasParentDocument extends Base {
		public parent?: vscode.TextDocument;
		getParent() {
			return this.parent;
		}
		public editor: vscode.TextEditor;
		// parentGet() {
		// 	super.get()
		// }
	};
}

// 🕮 <YL> 2ffa7b8f-a350-4353-a5ee-18eb39c9e82b.md
// mixins 🕮 <YL> 53cf7583-bd25-4fe2-9d6d-c81ddbf9e321.md
