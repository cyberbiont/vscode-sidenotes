import * as vscode from 'vscode';
import {
	OActiveEditorUtils,
	OAnchorer,
	OChangeTracker,
	ODesigner,
	OFileChangeTracker,
	OFileStorage,
	OMarkerUtils,
	OStorageService,
	OStyler,
	OVscodeChangeTracker,
 } from './types';

// import * as path from 'path';

// using type instead of interface allows to view Intellisense on all "of the extended" types
export type ICfg =
	OActiveEditorUtils & OMarkerUtils
	& OAnchorer
	& OChangeTracker & (OFileChangeTracker | OVscodeChangeTracker)
	& ODesigner & OStyler
	& OStorageService & OFileStorage
	& {
		behaviour: { //TODO
			autoStart: boolean
		}
		sources: {
			excludeFromAnnotation: vscode.GlobPattern, // TODO
		}
	}
;
const settings = vscode.workspace.getConfiguration('sidenotes');

const cfg: ICfg = {

	behaviour: {
		autoStart: settings.get('autoStart') || false
	},

	storage: {
		defaultEditorService: settings.get('defaultEditor') || 'vscode',
		files: {
			notesSubfolder: settings.get('notesSubfolder') || '.sidenotes',
			contentFileExtension: '.md'
		},
	},

	sources: {
		fileFormatsAllowedForTransfer: ['.md', '.markdown', '.mdown', '.txt'], // TODO
		excludeFromAnnotation: settings.get('excludeFromAnnotation') || '**/{node_modules,.git,.idea,target,out,build,vendor}/**/*', // glob  TODO
	},

	anchor: {
		marker: {
			useMultilineComments: settings.get('useMultilineComments') || false,
			salt: '✎ ',  // must be steady and included in RegExp search to disambiguate with other uuid entries that can happen in your code
			// template: '%p %id',
			// prefix: settings.get('markerPrefix') || '',
		},

		design: {
			before: settings.get('before') ||
				false,
				// '📖',
				// 'sidenote',
			after: settings.get('after') ||
				'🕮', // 🕮  🗅 🗆 🗇 🗈 🗉 🗊 🗒 ⯌ 🟉 🖉 ✎ ✏ ✐  🖆
				// '💬⯌',
			ruler: settings.get('ruler') || true,
			hideMarker: settings.get('hideMarker') || false,
			foldMarker: settings.get('foldMarker') || true,
			gutterIcon: settings.get('gutterIcon') || false,
			stateIndication: settings.get('stateIndication') || 'after',
			onOffIndication: settings.get('onOffIndication') || false,

			decorations: {
				common: {
					indicationColor: settings.get('onOffColor') || 'rgba(51, 88, 153, 1)',
					style: {
						// isWholeLine: true,
						// border: '1px solid white',
						cursor: 'pointer',
						// https://www.flaticon.com/free-icon/edit_1159633#term=note&page=1&position=1
						gutterIconSize: '80%',
						// borderTop
						rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
					},

				},

				active: {
					indicationColor: 'white',
					style: {
						// gutterIconPath: path.join(__dirname, '..', '..', 'images', 'sidenote_active.svg'),
					}
				},

				broken: {
					indicationColor: 'rgba(255, 0, 0, 1)',
					style: {
						// gutterIconPath: path.join(__dirname, '..', '..', 'images', 'sidenote_broken.svg'),
						// backgroundColor: 'rgba(255, 0, 0, 0.05)',
						// borderStyle: 'dotted',
					},
					message: `< BROKEN:
						content file, associated with this comment can not be found.
						Run 'annotate' command to choose action >`
				},

				empty: {
					indicationColor: 'rgba(255, 255, 0, 1)',
					style: {
						// gutterIconPath: path.join(__dirname, '..', '..', 'images', 'sidenote_empty.svg'),
						// borderStyle: 'dotted',
					},
					message: `< EMPTY: this sidenote is empty  >`
				}
			},
		},
	},
}

export default cfg;
