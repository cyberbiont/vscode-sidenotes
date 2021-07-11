import { OutputChannel, window } from 'vscode';

export default class VsOutputChannel {
	public channel: OutputChannel;
	constructor(public name: string) {
		this.channel = window.createOutputChannel(name);
		this.appendLine(`vscode-sidenotes started`);
	}

	appendLine(line: string) {
		return this.channel.appendLine(line);
	}
}
