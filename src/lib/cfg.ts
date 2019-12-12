import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

import {
	OActions,
	OAnchorer,
	OApp,
	OChangeTracker,
	OStyler,
	OEditorUtils,
	OFileChangeTracker,
	OFileStorage,
	OFileSystem,
	OMarkerUtils,
	OScanner,
	OSidenoteFactory,
	OStorageService,
	ODecorator,
	OEditorServiceController,
 } from './types';

export type ICfg =
	OEditorUtils & OMarkerUtils
	& OFileSystem
	& OAnchorer
	& OApp
	& OChangeTracker & OFileChangeTracker
	& OStyler & ODecorator
	& OStorageService & OFileStorage
	& OScanner
	& OSidenoteFactory
	& OEditorServiceController
	& OActions
;
const settings = vscode.workspace.getConfiguration('sidenotes');

const signature: string = settings.get('signature') || os.userInfo().username;
const notesSubfolder: string = settings.get('notesSubfolder') || path.join('.sidenotes', signature);

//@bug 🕮 <YL> 389a9433-4182-43cb-b559-e567ba7dfc95.md
const cfg: ICfg = {
	app: {
		defaultMarkdownEditor: settings.get('defaultMarkdownEditor') || 'vscode',
		hoverToolbar: settings.get('hoverToolbar') || true
	},

	storage: {
		files: {
			notesSubfolder,
			defaultContentFileExtension: settings.get('defaultContentFileExtension') || '.md',
			extensionsQuickPick: settings.get('extensionsQuickPick') || [],
		},
	},

	worskspaceFilter: {
		// 🕮 <YL> 7372242a-1c7a-4342-8de9-9a45539d2f39.md
		include: settings.get('filter.include')
			||  "**/*",
		exclude: settings.get('filter.exclude')
			|| `**/{node_modules,.git,.idea,target,out,build,vendor}/**/*`,
	},

	// 🕮 <YL> 7995614f-ef55-42c0-a9f6-e372ba94e93b.md
	anchor: {

		comments: {
			useBlockComments: false,
			cleanWholeLine: true,
			affectNewlineSymbols: true
		},

		marker: {
			// 🕮 <YL> f7cc1c04-8751-4431-af02-a912c375750c.md
			prefix: settings.get('prefix') || '',
			salt: '🕮',
			signature,
			signatureFilter: settings.get('signatureFilter'),
			readUnsigned: settings.get('readUnsigned')
		},

		styles: {
			settings: {
				before: settings.get('design.before') || false,
				after: settings.get('design.after') || '🕮',
				ruler: settings.get('design.ruler') || true,
				gutterIcon: settings.get('design.gutterIcon') || true,
				hideMarkers: settings.get('design.hideMarkers') || true,
				colorIndication: settings.get('design.colorIndication') || ['after', 'text', 'ruler'],
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
			},

			instanceRenderOptions: (color: string) => ({
				after: {
					border: `1px dotted ${color}`
				}
			})
		},

		// markersVisible: {
		// 	settings: {
		// 		hideMarkers: false
		// 	}
		// }
	}
};

export default cfg;
