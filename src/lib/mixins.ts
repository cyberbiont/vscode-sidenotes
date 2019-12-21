/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { TextEditor } from 'vscode';

export interface HasState {
	state: boolean;
	setState(value: boolean): boolean;
	getState(): boolean;
	toggleState(): boolean;
}

// 🕮 <YL> d42128f8-3012-4679-9bf2-6c7a3f65a5cc.md

export function Initializable<T extends Constructor>(Base: T) {
	return class Initializable extends Base {
		public isInitialized = false;
	};
}
export type Initializable = Mixin<typeof Initializable>;

export function HasEditorReference<T extends Constructor>(Base: T) {
	return class HasEditorReference extends Base {
		public editor: TextEditor;
	};
}
export type HasEditorReference = Mixin<typeof HasEditorReference>;

// 🕮 <YL> 2ffa7b8f-a350-4353-a5ee-18eb39c9e82b.md
// mixins 🕮 <YL> 53cf7583-bd25-4fe2-9d6d-c81ddbf9e321.md
