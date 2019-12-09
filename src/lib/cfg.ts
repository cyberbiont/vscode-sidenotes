import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

import {
	OActions,
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
	OEditorServiceController,
 } from './types';

export type ICfg =
	OEditorUtils & OMarkerUtils
	& OFileSystem
	& OAnchorer
	& OApp
	& OChangeTracker & OFileChangeTracker
	& ODesigner & OStyler
	& OStorageService & OFileStorage
	& OScanner
	& OSidenoteFactory
	& OEditorServiceController
	& OActions
;
const settings = vscode.workspace.getConfiguration('sidenotes');

const signature: string = settings.get('signature') || os.userInfo().username;
const notesSubfolder: string = settings.get('notesSubfolder') || path.join('.sidenotes', signature);

const cfg: ICfg = {
	app: {
		defaultMarkdownEditor: settings.get('defaultMarkdownEditor') || 'vscode',
		hoverToolbar: settings.get('hoverButtons') || true
	},

	storage: {
		files: {
			notesSubfolder,
			defaultContentFileExtension: '.md', // default content files extension. json setting: 🕮 <YL> b7f19c02-664e-4c1b-bfb1-9fbe581978f2.md
			extensionsQuickPick: ['.md', '.mmap', '.xmind'],
		},
	},

	filter: {
		// 🕮 <YL> 7372242a-1c7a-4342-8de9-9a45539d2f39.md
		includePattern: settings.get('includeFilter')
			||  "**/*",
		excludePattern: settings.get('excludeFilter')
			|| `**/{node_modules,.git,.idea,target,out,build,vendor}/**/*`,
	},

	// 🕮 <YL> 7995614f-ef55-42c0-a9f6-e372ba94e93b.md
	anchor: {
		comments: {
			useBlockComments: false,
			cleanWholeLine: true,
			// affectNewlineSymbols: false
		},
		marker: {
			// 🕮 <YL> f7cc1c04-8751-4431-af02-a912c375750c.md
			prefix: settings.get('prefix') || '',
			salt: '🕮',
			signature,
			readSignatures: settings.get('readSignatures'),
			readUnsigned: settings.get('readUnsigned')
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
					message: `⮜ BROKEN ⮞
					Can not find content file, associated with this comment.
					Run 'annotate' command to choose your action.`
				},

				empty: {
					color: 'rgb(248, 171, 27)',
					icon: 'sidenote_empty.svg',
					message: `⮜ EMPTY ⮞ This sidenote is empty.`
				},
			}
		}
	}
};

export default cfg;
