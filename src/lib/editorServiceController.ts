import {
	SystemDefaultEditor,
	TyporaEditor,
	VscodeEditor,
} from './editorService';

export type OEditorServiceController = {
	app: {
		defaultMarkdownEditor: 'typora'|'vscode'|'system default',
	}
}

export default class editorServiceController {
	public markdownEditor: TyporaEditor | SystemDefaultEditor | VscodeEditor;

	constructor(
		private typora: TyporaEditor,
		private systemDefault: SystemDefaultEditor,
		private vscode: VscodeEditor,
		private cfg: OEditorServiceController
	) {
		switch (this.cfg.app.defaultMarkdownEditor) {
			case 'typora': this.markdownEditor = this.typora;	break;
			case 'system default': this.markdownEditor = this.systemDefault;	break;
			case 'vscode':
			default: this.markdownEditor = this.vscode;
		}
	}
	// 🕮 <YL> 114e29b0-8288-4b64-9fde-060bbb889c90.md
	open(path: string, extension: string) {
		switch(extension) {
			case '.md':
			case '.mdown':
			case '.markdown':
				this.markdownEditor.open(path); break;
			default:
				this.systemDefault.open(path);
		}
	}
}
