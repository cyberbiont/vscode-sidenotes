import vscode from 'vscode';
import cfg from './lib/cfg';
import App from './lib/app';

let app: App;

export function activate(context: vscode.ExtensionContext): void {
	try {
		app = new App(cfg, context);
	} catch (e) {
		console.log(e);
	}
}

export function deactivate(this: any): void {
	console.log(this);
	// this._subscriptions.dispose();
	app.actions.decorator.disposeDecorationTypes();
	app.actions.pool.clear();
	// app.storageService.watcherService.dispose();
}
// 🕮 <cyberbiont> c4a3b3d6-2db2-4a35-8ed1-94450fef4997.md
