import App from './lib/app';
import ConfigMaker from './lib/cfg';
import vscode from 'vscode';

let app: App;

export function activate(context: vscode.ExtensionContext): void {
	try {
		const cfg = new ConfigMaker().create();
		app = new App(cfg, context);
	} catch (e) {
		console.log(e);
	}
}

export function deactivate(this: unknown): void {
	// console.log(this);
	// this._subscriptions.dispose();
	app.actions.decorator.disposeDecorationTypes();
	app.actions.pool.clear();
	// app.storageService.watcherService.dispose();
}
// 🕮 <cyberbiont> c4a3b3d6-2db2-4a35-8ed1-94450fef4997.md
