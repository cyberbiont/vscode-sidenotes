import * as vscode from 'vscode';
import {
	IActiveEditorUtilsCfg,
	IAnchorerCfg,
	IChangeTrackerCfg,
	IDesignerCfg,
	IFileChangeTrackerCfg,
	IFileStorageCfg,
	IMarkerUtilsCfg,
	IStylerCfg,
 } from './types';

import * as path from 'path';

// using type instead of interface allows to view Intellisense on all "of the extended" types
export type ICfg =
	IAnchorerCfg &
	IActiveEditorUtilsCfg &
	IMarkerUtilsCfg &
	IFileStorageCfg &
	IDesignerCfg &
	IStylerCfg &
	IFileChangeTrackerCfg &
	IChangeTrackerCfg & {
		// global: {
		// 	defaultEditor: 'vscode'|'Typora'|'system default',
		// 	excludeFromAnnotation: vscode.GlobPattern,
		//  autoStart
		// }
	}

const vscCfg = vscode.workspace.getConfiguration('sidenotes');

const cfg: ICfg = {
	notesSubfolder: vscCfg.get('notesSubfolder') || '.sidenotes',

	// anchor: {
	// 	marker: {
	// 		salt: '✎ ',
	// 		// template: '%p %id',
	// 		useMultilineComments: vscCfg.get('notesSubfolder') || true
	// 	},

	// 	design: {
	// 		hideMarker: vscCfg.get('markerPrefix') || true,
	// 		gutterIcon: vscCfg.get('gutterIcon') ||true,
	// 		statusHighlight: vscCfg.get('statusHighlight') ||true,
	// 		// decorations
	// 	}
	// },
	// global: {
	// 	excludeFromAnnotation: vscCfg.get('excludeFromAnnotation') || '**/{node_modules,.git,.idea,target,out,build,vendor}/**/*', //glob
	// 	defaultEditor: vscCfg.get('defaultEditor')||'vscode',
	// },


	marker: {
		prefix: vscCfg.get('markerPrefix') || '',
		salt: '✎ ', // must be steady and included in RegExp search to disambiguate with other uuid entries that can happen in your code
		// template: '%p %id',
	},


	decorations: {

		common: {
			style: {
				// https://www.flaticon.com/free-icon/edit_1159633#term=note&page=1&position=1
				gutterIconPath: path.join(__dirname, '..', '..', 'images', 'sidenote.svg'),
				gutterIconSize: '80%',
				// borderWidth: '1px',
				// borderStyle: 'dashed',
				// borderColor: 'grey',
				opacity: '0.0',
				cursor: 'pointer',
				// before: {
				// 	// contentText: 'note: ',
				// 	// contentText: 'sidenote',
				// 	// margin: '0 0.5em 0 0'
				// 	// contentIconPath: path.join(__dirname, '..', '..', 'images', 'sidenote_active.svg')
				// },
				// after: {
				// 	contentText: '✎ ',
				// }
				backgroundColor: 'rgba(128, 128, 128, 0.25)'
				// overviewRulerColor: 'blue',
				// overviewRulerLane: vscode.OverviewRulerLane.Right,
			}
		},

		active: {
			style: {
				// gutterIconPath: path.join(__dirname, '..', '..', 'images', 'sidenote_active.svg'),
				// borderColor: 'rgba(0, 128, 0, 0.5)'
				after: {
					contentText: '✎ ',
					color: 'rgba(0, 128, 0, 0.5)'
				}
			}
		},

		broken: {
			style: {
				// gutterIconPath: path.join(__dirname, '..', '..', 'images', 'sidenote_broken.svg'),
				// borderColor: 'rgba(255, 0, 0, 1)',
				// backgroundColor: 'rgba(255, 0, 0, 0.05)',
				// borderStyle: 'dotted',
				after: {
					contentText: '✎ ',
					color: 'rgba(255, 0, 0, 1)'
				}
			},
			message: `< BROKEN:
				content file, associated with this comment can not be found.
				Run 'annotate' command to choose action >`
		},

		empty: {
			style: {
				// gutterIconPath: path.join(__dirname, '..', '..', 'images', 'sidenote_empty.svg'),
				// borderColor: 'rgba(255, 255, 0, 0.5)',
				borderStyle: 'dotted',
				after: {
					contentText: '✎ ',
					color: 'rgba(255, 255, 0, 0.5)'
				}
			},
			message: `< EMPTY: this sidenote is empty  >`
		}
	},
	fileFormatsAllowedForTransfer: ['.md', '.markdown', '.mdown', '.txt'],
	useMultilineComments: true
}

export default cfg;
