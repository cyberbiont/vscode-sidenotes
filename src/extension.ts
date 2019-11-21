import * as vscode from 'vscode';
import cfg from './lib/cfg';
import App from './lib/app';

let app: App;

export function activate(context: vscode.ExtensionContext) {
	// if (cfg.app.autoStart) {
		// initApp();
	// } else {
	// 	vscode.commands.registerCommand('sidenotes.activate', () => {
	// 		initApp
	// 	})
	// }
	app = new App(cfg, context);
	// function initApp() {
	// 	app = new App(cfg, context);

	// activationEvents:
	// "onCommand:sidenotes.annotate",
	// "onCommand:sidenotes.display",
	// "onDebug"



}
export function deactivate() {
	this._subscriptions.dispose();
	app.actions.styler.disposeDecorationTypes();
	app.actions.pool.clear();
}
