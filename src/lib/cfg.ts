import * as vscode from 'vscode';
/**
* @global {object} contains user configuration for this extension
*/

const cfg: {
	// UUID_REGEXP_STRING: string,
	// UUID_REGEXP: RegExp,
	// sidenoteIdMarkerRegExp: RegExp
	notesSubfolder: string
	prefix: string
	steadyPrefix: string
	anchorFormula: string
	decorations: {
		// typeStyle: vscode.DecorationRenderOptions,
		// decorationType: vscode.TextEditorDecorationType
		// presets: {
		[preset: string]: {
			style: vscode.DecorationRenderOptions
			message?: string
		}
		// }
		// [preset: string]: {
		// 	style: vscode.DecorationRenderOptions,
		// 	message?: string
		// }
	},
	externalEditor?: string
	autoPreview?: boolean
	createFileAtOnce?: boolean
	useMultilineComments ?: boolean
	fileFormatsAllowedForTranfer  ?: string[]
	// transferSelection ?: boolean,
} = {
	// UUID_REGEXP_STRING: ('(\\d|[a-z]){8}-(\\d|[a-z]){5}-(\\d|[a-z]){4}-(\\d|[a-z]){4}-(\\d|[a-z]){12}'),
	// UUID_REGEXP: new RegExp(this.UUID_REGEXP_STRING, 'g'),
	// sidenoteIdMarkerRegExp: new RegExp(`${this.steadyPrefix}${this.UUID_REGEXP_STRING}`, 'g'),
	notesSubfolder: vscode.workspace.getConfiguration('sidenotes').get('notesSubfolder') || '.sidenotes',
	prefix: vscode.workspace.getConfiguration('sidenotes').get('markerPrefix') || 'NOTE ',
	steadyPrefix: '✎', // must be steady and included in Regexp search to disambiguate with other uuid entries that can happen in your code
	anchorFormula: 'NOTE %s ✎',
	decorations: {
		common: {
			style: {
				borderWidth: '1px',
				borderStyle: 'solid',
				// opacity: '0.3'
				// overviewRulerColor: 'blue',
				// overviewRulerLane: vscode.OverviewRulerLane.Right,
			}
		},
		// decorationType: vscode.window.createTextEditorDecorationType(this.typeStyle),
		active: {
			style: {
				borderColor: 'green'
			}
		},
		broken: {
			style: {
				borderColor: 'red'
			},
			message: `< BROKEN file associated with this comment can not be found.
			you can delete this comment with sidenotes:delete
			you can annotate this comment, file will re-created >`
		},
		empty: {
			style: {
				borderColor: 'yellow',
			},
			message: `< EMPTY this sidenote is empty >`
		}
	},
	fileFormatsAllowedForTranfer: ['.md', '.markdown', '.mdown', '.txt'],
	useMultilineComments: true
}

export default cfg;
