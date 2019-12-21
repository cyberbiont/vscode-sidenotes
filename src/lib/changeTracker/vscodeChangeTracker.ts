import { workspace, TextDocument, ExtensionContext } from 'vscode';
import { EventEmitter } from 'events';
import ChangeTracker from './changeTracker';
import { IdProvider } from '../idProvider';
import { MarkerUtils } from '../utils';

export type OVscodeChangeTracker = {};

export default class VscodeChangeTracker extends ChangeTracker {
	constructor(
		idProvider: IdProvider,
		eventEmitter: EventEmitter,
		utils: MarkerUtils,
		public context: ExtensionContext,
	) {
		super(idProvider, eventEmitter, utils);
	}

	init(): void {
		workspace.onDidSaveTextDocument(
			this.onChange,
			this,
			this.context.subscriptions,
		);
	}

	onChange(document: TextDocument): void {
		this.generateCustomEvent(document.fileName, 'change');
	}
}
