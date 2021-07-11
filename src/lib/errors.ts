import { FileSystemError, window } from 'vscode';

import VsOutputChannel from './outputChannel';

export class ErrorHandlers {
	constructor(public channel: VsOutputChannel) {}

	async error(err: Error) {
		console.log(err);
		this.channel.appendLine(err.message);
	}

	async cancel(err: Error) {
		console.log(err);
		window.showErrorMessage(err.message);
		this.channel.appendLine(err.message);
		throw err;
	}

	async resume(err: Error) {
		// log and continue
		console.log(err);
		// window.showWarningMessage(err.message);
		this.channel.appendLine(err.message);
	}
}

export default class Errors {
	constructor(public channel: VsOutputChannel) {}

	public VsError = class VsError extends Error {
		readonly name = this.constructor.name;
		constructor(public rootThis: Errors, message = ``) {
			super(message);
		}
	}.bind(null, this);

	public InteractionError = class InteractionError extends this.VsError {
		constructor(
			message = ``,
			public description = `User hasn't provided input.`,
		) {
			super(`${description} ${message}`);
		}
	};
}
