import {
	EditorService,
	ShellEditorService,
	SystemDefaultEditorService,
	VscodeEditorService,
} from './editorService';

import { Uri } from 'vscode';

export type OEditorServiceController = {
	app: {
		defaultMarkdownEditor: `typora` | `vscode` | `system default`;
	};
};

export default class EditorServiceController {
	public markdownEditor: EditorService;

	constructor(
		private shell: ShellEditorService,
		private systemDefault: SystemDefaultEditorService,
		private vscode: VscodeEditorService,
		private cfg: OEditorServiceController,
	) {
		switch (this.cfg.app.defaultMarkdownEditor) {
			case `typora`:
				this.markdownEditor = this.shell;
				break;
			case `system default`:
				this.markdownEditor = this.systemDefault;
				break;
			case `vscode`:
			default:
				this.markdownEditor = this.vscode;
		}
	}

	// 🕮 <cyberbiont> 114e29b0-8288-4b64-9fde-060bbb889c90.md
	open(uri: Uri, extension: string) {
		switch (extension) {
			case `.md`:
			case `.mdown`:
				this.markdownEditor.open(uri);
				break;
			case `.cson`:
			case `.markdown`:
				this.shell.open(uri.fsPath, extension);
				break;
			default:
				this.systemDefault.open(uri.fsPath);
		}
	}
}
