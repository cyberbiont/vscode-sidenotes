import * as vscode from 'vscode';
import ChangeTracker from './changeTracker';
import {
	IIdMaker,
	EventEmitter,
	IChangeData
} from '../types';

// export type IVscodeChangeTrackerCfg = {
// }

export default class VscodeChangeTracker extends ChangeTracker {
	constructor(
		idMaker: IIdMaker,
		eventEmitter: EventEmitter,
		public context: vscode.ExtensionContext
	) {
		super(idMaker, eventEmitter);
	}

	init() {
		vscode.workspace.onDidSaveTextDocument(this.onChange, this, this.context.subscriptions);
	}

	onChange(document: vscode.TextDocument) {
		this.generateCustomEvent(document.fileName, 'change');
	}
}
