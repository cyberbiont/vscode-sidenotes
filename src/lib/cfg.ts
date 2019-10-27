import * as vscode from 'vscode';
import {
	IDesignerCfg,
	IAnchorerCfg,
	IActiveEditorUtilsCfg,
	IMarkerUtilsCfg,
	IFileStorageCfg,
	IStylerCfg,
	IWatchTrackerCfg
 } from './types';

// using type instead of interface allows to view Intellisense on all "of the extended" types
export type ICfg =
	IAnchorerCfg &
	IActiveEditorUtilsCfg &
	IMarkerUtilsCfg &
	IFileStorageCfg &
	IDesignerCfg &
	IStylerCfg &
	IWatchTrackerCfg

const cfg: ICfg = {
	notesSubfolder: vscode.workspace.getConfiguration('sidenotes').get('notesSubfolder') || '.sidenotes',
	marker: {
		prefix: vscode.workspace.getConfiguration('sidenotes').get('markerPrefix') || 'NOTE ',
		salt: '✎', // must be steady and included in RegExp search to disambiguate with other uuid entries that can happen in your code
		// template: '%p %id',
	},
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
			you can delete this comment with sidenotes:delete >`
		},
		empty: {
			style: {
				borderColor: 'yellow',
			},
			message: `< EMPTY this sidenote is empty >`
		}
	},
	fileFormatsAllowedForTransfer: ['.md', '.markdown', '.mdown', '.txt'],
	useMultilineComments: true
}

export default cfg;
