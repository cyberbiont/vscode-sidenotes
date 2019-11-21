import * as vscode from 'vscode';

import {
	OAnchorer,
	OApp,
	OChangeTracker,
	ODesigner,
	OEditorUtils,
	OFileChangeTracker,
	OFileStorage,
	OFileSystem,
	OMarkerUtils,
	OStorageService,
	OStyler,
	OVscodeChangeTracker,
 } from './types';

export type ICfg =
	OEditorUtils & OMarkerUtils
	& OFileSystem
	& OAnchorer
	& OApp
	& OChangeTracker & (OFileChangeTracker | OVscodeChangeTracker)
	& ODesigner & OStyler
	& OStorageService & OFileStorage
	& {
		sources: {
			excludeFromAnnotation: vscode.GlobPattern, // TODO
		}
	}
;
const settings = vscode.workspace.getConfiguration('sidenotes');

const cfg: ICfg = {
	app: {
		autoStart: settings.get('autoStart') || false,
		defaultEditor: settings.get('defaultEditor') || 'vscode',
	},

	storage: {
		files: {
			notesSubfolder: settings.get('notesSubfolder') || '.sidenotes',
			contentFileExtension: settings.get('contentFileExtension') || '.md'
		},
	},

	sources: {
		fileFormatsAllowedForTransfer: ['.md', '.markdown', '.mdown', '.txt'], // TODO
		excludeFromAnnotation: settings.get('excludeFromAnnotation') || '**/{node_modules,.git,.idea,target,out,build,vendor}/**/*', // glob  TODO
	},

	// 🕮 7995614f-ef55-42c0-a9f6-e372ba94e93b
	anchor: {
		comments: {
			useBlockComments: false,
			cleanWholeLine: true,
			// affectNewlineSymbols: false
		},
		marker: {
			prefix: settings.get('prefix') || '',
			salt: '🕮 ',
		},
		styles: {
			settings: {
				before: settings.get('before') || false,
				after: settings.get('after') || '🕮',
				ruler: settings.get('ruler') || true,
				gutterIcon: settings.get('gutterIcon') || false,
				hideMarkers: settings.get('hideMarkers') || true,
				colorIndication: settings.get('colorIndication') || ['after', 'text', 'ruler'],
			},

			categories: {
				common: {
					style: {
						cursor: 'pointer',
						rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
						gutterIconSize: '80%',
					},
					icon: 'sidenote.svg',
					color: {
						dark: 'rgb(255, 255, 255)',
						light: 'rgb(0, 0, 0)'
					},
					// color: 'rgb(13, 242, 201)',
					message: ''
				},

				// style categories to become separate decorationTypes
				active: {
					// icon: 'open-book2.svg',
				},

				broken: {
					color: 'rgba(255, 0, 0, 1)',
					icon: 'sidenote_broken.svg',
					message: `⮜ BROKEN ⮞:
					Can not find content file, associated with this comment.
					Run 'annotate' command to choose your action.`
				},

				empty: {
					color: 'rgb(248, 171, 27)',
					icon: 'sidenote_empty.svg',
					message: `⮜ EMPTY ⮞: this sidenote is empty.`
				},
			}
		}
	}
};

export default cfg;
