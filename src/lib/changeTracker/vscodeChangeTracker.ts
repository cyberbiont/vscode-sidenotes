import * as vscode from 'vscode';
import ChangeTracker from './changeTracker';
import {
	IIdMaker,
	EventEmitter,
	IChangeData,
	MarkerUtils
} from '../types';

export type OVscodeChangeTracker = {
}

export default class VscodeChangeTracker extends ChangeTracker {
	constructor(
		idMaker: IIdMaker,
		eventEmitter: EventEmitter,
		utils: MarkerUtils,
		public context: vscode.ExtensionContext
	) {
		super(idMaker, eventEmitter, utils);
	}

	init() {
		vscode.workspace.onDidSaveTextDocument(this.onChange, this, this.context.subscriptions);
	}

	onChange(document: vscode.TextDocument) {
		this.generateCustomEvent(document.fileName, 'change');
	}
}
