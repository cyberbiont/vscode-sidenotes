import * as vscode from 'vscode';
import cfg from './lib/cfg';
import App from './lib/app';

//TODO someday when VSCode will support folding ranges, to make uuids fold
//TODO support other file formats beside Markdown, such as mind maps (no hover, open in external application, separate command with file extension prompt)

export function activate(context: vscode.ExtensionContext) {
	// console.log('running activation function');
	const app = new App(cfg, context);
}
export function deactivate() {
	this._subscriptions.dispose();
	// console.log('Deactivating sidenotes')
}
