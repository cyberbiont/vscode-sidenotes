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
	OScanner,
	OSidenoteFactory,
	OStorageService,
	OStyler,
	// OVscodeChangeTracker,
 } from './types';

export type ICfg =
	OEditorUtils & OMarkerUtils
	& OFileSystem
	& OAnchorer
	& OApp
	& OChangeTracker & (
		OFileChangeTracker
		// | OVscodeChangeTracker
		)
	& ODesigner & OStyler
	& OStorageService & OFileStorage
	& OScanner
	& OSidenoteFactory
;
const settings = vscode.workspace.getConfiguration('sidenotes');

const cfg: ICfg = {
	app: {
		defaultMarkdownEditor: settings.get('defaultMarkdownEditor') || 'vscode',
		formats: {
			file: {
				'.md': settings.get('defaultMarkdownEditor') || 'vscode',
				'.markdown': settings.get('defaultMarkdownEditor') || 'vscode',
				'.mdown': settings.get('defaultMarkdownEditor') || 'vscode',
				'.mmap': 'systemDefault',
				'.txt': 'systemDefault'
			}
		}
	},

	storage: {
		files: {
			notesSubfolder: settings.get('notesSubfolder') || '.sidenotes',
			defaultContentFileExtension: '.md' // default content files extension. json setting: 🕮 b7f19c02-664e-4c1b-bfb1-9fbe581978f2
			// extensionsQuickPick: ['.md', '.mmap', '.xmind'] // TODO
		},
	},

	sources: {
		// 🕮 7372242a-1c7a-4342-8de9-9a45539d2f39
		matchFiles: settings.get('includeFilter')
			||  "**/*",
		excludeFiles: settings.get('excludeFilter')
			|| '**/{node_modules,.git,.idea,target,out,build,vendor}/**/*',
	},

	// 🕮 7995614f-ef55-42c0-a9f6-e372ba94e93b
	anchor: {
		comments: {
			useBlockComments: false,
			cleanWholeLine: true,
			// affectNewlineSymbols: false
		},
		marker: {
			// 🖉 f7cc1c04-8751-4431-af02-a912c375750c
			prefix: settings.get('prefix') || '',
			salt: '🕮',
			signature: 'YL',
			readSignatures: ['YL']
			//TODO glob support for signatures
		},
		styles: {
			settings: {
				before: settings.get('before') || false,
				after: settings.get('after') || '',
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

				// style categories to become separate decorationTypes:

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
