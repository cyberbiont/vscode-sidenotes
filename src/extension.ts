import * as vscode from 'vscode';
// import { workspace, window, WorkspaceEdit, Position, TextEditor, Range, commands, TextDocument } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
const uuidv4 = require('uuid/v4');

let sidenotesAnchorsMemory = {};
let activeEditor = vscode.window.activeTextEditor;
//TODO someday when VSCode will support folding ranges, to make uuids fold



export function activate(context:vscode.ExtensionContext) {

	if (!vscode.workspace.workspaceFolders) throw new Error('Adding notes requires an open folder.');

	const cfg = getCfg(vscode.workspace.getConfiguration('sidenotes'));
	const UUID_REGEXP = /(\d|[a-z]){8}-(\d|[a-z]){4}-(\d|[a-z]){4}-(\d|[a-z]){4}-(\d|[a-z]){12}/g
	/**
	* @todo: TODO implement this as custom type
	* @const {string} RegExp to match sidenote ID expression
	*/
	const SIDENOTE_ID_REGEXP = new RegExp(cfg.steadyPrefix + UUID_REGEXP);

	/**
	 * gets user configuration for this extension
	 *
	 * @param {vscode.WorkspaceConfiguration} cfg
	 * @returns {object} configuration object
	 */
	function getCfg(cfg:vscode.WorkspaceConfiguration) {
		return {

			get notesFolder() {
				/**
				* because VSCode allow several rootFolders, we need to check where are document resides every time
				* also checks that current document is not outside open folder (otherwise note will be saved in wrong folder)
				* prepares folder to keep sidenote files in and returns path to it

				* @returns { string } path to sidenotes folder
				*/
				const documentPath = vscode.window.activeTextEditor.document.fileName;
				const rootFolder = vscode.workspace.workspaceFolders.find(workspaceFolder => documentPath.includes(workspaceFolder.uri.fsPath));

				if (!rootFolder) throw new Error(`Files outside of a workspace cannot be annotated.`);

				// vscode.workspace.getConfiguration('sidenotes').get('notesFolder');
				const notesFolder = path.join(rootFolder.uri.fsPath, '.sidenotes');

				if (!fs.existsSync(notesFolder)) fs.mkdirSync(notesFolder);
				return notesFolder;
			},
			prefix: 'NOTE ', //vscode.workspace.getConfiguration('sidenotes').get('markerPrefix');
			steadyPrefix: '✎', // must be steady and included in Regexp search to disambiguate with other uuid entries that can happen in your code
			decorationType: {
				'active': {
					borderWidth: '1px',
					borderStyle: 'solid',
					overviewRulerColor: 'blue',
					overviewRulerLane: vscode.OverviewRulerLane.Right,
					light: {
						// this color will be used in light color themes
						borderColor: 'grey'
						// borderBottom: '1px soild darkblue'
					},
					dark: {
						// this color will be used in dark color themes
						borderColor: 'grey'
						// borderBottom: '1px soild lightblue'
					}
				},
				broken: {
					borderWidth: '1px',
					borderStyle: 'solid',
					overviewRulerColor: 'blue',
					overviewRulerLane: vscode.OverviewRulerLane.Right,
					light: {
						borderColor: 'red'
					},
					dark: {
						borderColor: 'red'
					}
				}

			}
		};
	}

	/**
	 * gets absolute path ti sidenote file
	 *
	 * @param {string} uuid
	 * @returns {string} sidenote path
	 */
	function getNoteFilepath(uuid:string):string {
		return path.join(cfg.notesFolder, `${uuid}.md`);
	}

	async function getNoteFileContent(uuid:string):Promise<string> {
		const filePath:string = getNoteFilepath(uuid);
		const noteContent = fs.promises.readFile(filePath, { encoding: 'utf8' });
		return noteContent;
	}

	function getDecoration(pos:vscode.Position, noteText:string): vscode.DecorationOptions {
		return {
			range: new vscode.Range(
				pos,
				new vscode.Position(pos.line, 100)
			),
			hoverMessage: noteText
		};
	}

	function getDecorationType(style:string) {
		return vscode.window.createTextEditorDecorationType(cfg.decorationType[style]);
	}

	function updateAnchorDecoration(position:vscode.Position, noteContent:string, style) {
		// const noteContent = getNoteFileContent();
		return activeEditor.setDecorations(getDecorationType(style), [getDecoration(position, noteContent)]);
	}

	async function processAnchor(uuid:string) {
		const noteContent = await getNoteFileContent(uuid);
		const style = noteContent ? 'active' : 'broken';
		let offset = activeEditor.document.getText().indexOf(uuid);
		// if (~offset) {
			offset -= cfg.prefix.length + 3; // move back to include prefix part and comment symbols:
			const position = activeEditor.document.positionAt(offset);
			updateAnchorDecoration(position, noteContent, style);
		// }

	}

	function activateAnchors() {
		const text = activeEditor.document.getText();
		const matches = text.match(SIDENOTE_ID_REGEXP); // gets uuids


		return matches.forEach(processAnchor);
	}

	/**
	 *  sets all the decorations for all the notes in current document
	 *
	 * @param {vscode.TextEditor} activeTextEditor
	 */
	/* function updateDecorations(activeEditor:vscode.TextEditor = vscode.window.activeTextEditor) {

		const decorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType(cfg.decorationType);
		const text = activeEditor.document.getText();
		const matches = text.match(UUID_REGEXP);

		matches.forEach(uuid => {
			// read the file for the uuid
			const filePath:string = getNoteFilepath(uuid);
			fs.readFile(filePath, (err, data) => {
				let noteText:string;
				if (err) {
					// ignore errors for now and add a warning message
					noteText = `WARNING: MISSING NOTE FILE\nNote file ${filePath} does not exist or could not be read.
					To stop seeing this warning message create that file and add markdown content to it or remove this comment.`
				} else {
					noteText = data.toString();
				}

				// set the decoration for the comment
				let offset = text.indexOf(uuid);
				if (~offset) {
					// move back to include prefix part and comment symbols:
					offset -= cfg.prefix.length+3;
					const pos = activeEditor.document.positionAt(offset);

					const decoration = {
						range: new vscode.Range(
							pos,
							new vscode.Position(pos.line, 100)
						),
						hoverMessage: noteText
					};
					// const decorations: vscode.DecorationOptions[] = [];
					// decorations.push(decoration);
					activeEditor.setDecorations(decorationType, [decoration]);
				}
			});
		});
	} */

	/**
	 * if documents resides in the specified subnotes folder, returns associated uuid derived from file name
	 *
	 * @param {vscode.TextDocument} document
	 * @returns {string} sidenote document UUID
	 */
	function getNoteFileUUID(document:vscode.TextDocument):string {
		return document.uri.fsPath.match(new RegExp(`.*\\${cfg.notesFolder}.(${SIDENOTE_ID_REGEXP})\.md`))[1];
	}


	/**
	 * opens sidenote document, associated with comment anchor in current line, creating comment and document if they don't exits
	 *
	 * @param {string} uuid
	 * @param {boolean} noteFileExists
	 * @returns {Promise<vscode.textDocument>} opened document
	 */
	async function openSidenote(uuid:string, noteFileExists:boolean) {
		const noteFilePath = getNoteFilepath(uuid);

		let URI:vscode.Uri;

		/**
		 * shows sidenote in new editor window
		 *
		 * @param {vscode.TextDocument} sidenote
		 * @returns {Promise<vscode.TextEditor} editor with opened sidenote
		 */
		const showSidenote = async (sidenote:vscode.TextDocument) => {
			// return vscode.window.showTextDocument(sidenote, vscode.ViewColumn.Three);
			return vscode.window.showTextDocument(sidenote, vscode.ViewColumn.Beside);
			// TODO vscode.setEditorLayout - make horizontal split and open preview to the bottom
			// return sidenote;
		};

		if (noteFileExists) {
			URI = vscode.Uri.parse(`file:${noteFilePath}`);
			vscode.workspace.openTextDocument(URI).then(
				showSidenote,
				error => {
					vscode.window.showErrorMessage('The sidenote anchor you are trying to open has no associated document file');
					deleteCommentAnchorInCurrentEditor(uuid);
				}
			);
		} else {
			URI = vscode.Uri.parse(`untitled:${noteFilePath}`);
			vscode.workspace.openTextDocument(URI).then(
				showSidenote,
				error => vscode.window.showErrorMessage('Error: could not create document')
			);
		}
		// 	error => {
		// 		vscode.window.showErrorMessage('Opening sidenote editor failed.');
		// 		vscode.commands.executeCommand('undo');
		// 		// setTimeout(() => {
		// 		// 	vscode.commands.executeCommand('undo');
		// 		// 	vscode.commands.executeCommand('undo');
		// 		// }, 3000);
		// 	}
	}

	function deleteCommentAnchorInCurrentEditor(uuid:string) {

	}
	function pruneBrokenComments() {

	}

	function pruneEmptySidenotes() {

	}
	function migrateSidenotes(folder) {

	}


	/**
	 * creates anchor comment with randomly generated UUID at current cursor position
	 *
	 * @param {vscode.Position} currentPos
	 * @returns {Promise<string>} {resolves to UUID of created anchor comment
	 */
	async function createAnchorComment(currentPos:vscode.Position):Promise<string> {
		const newUUID:string = uuidv4();
		const marker = `${cfg.prefix}${newUUID}`;
		return await vscode.window.activeTextEditor
			.edit(
				edit => { edit.insert(currentPos, marker); },
				{ undoStopAfter: false, undoStopBefore: false }
			)
			.then(
				result => {
					vscode.commands.executeCommand('editor.action.commentLine');
					processAnchor(newUUID);
					addAnchorToMemory(newUUID, currentPos);
					return newUUID;
				},
				error => vscode.window.showErrorMessage('Adding sidenote anchor failed.')
			)
	}

	function addAnchorToMemory(uuid:string, position:vscode.Position):object {
		return sidenotesAnchorsMemory[uuid] = {
			editor: activeEditor,
			position
		};
	}




	/**
	* gets UUID value if such is present in active editor line, corresponding to passed position. ATTENTION: only first comment from line is returned, so don't add more than one!
	*
	* @param {vscode.Position} currentPos
	* @returns {(string|null)} anchor comment UUID or null
	*/
	function getUUIDfromPosition(position:vscode.Position):string {
		const line = activeEditor.document.lineAt(position);
		if (line.isEmptyOrWhitespace) return undefined;
		const match = line.text.match(SIDENOTE_ID_REGEXP);
		if (match) return match[0];
		else return null;
	}

	/**
	 * gets currents position in active editor
	 *
	 * @returns {vscode.Position} Position in active editor
	 */
	function getCurrentPosition():vscode.Position {
		return vscode.window.activeTextEditor.selection.anchor;
	}

	/**
	 * open sidenote associated with anchor comment at current cursor position or creates comment and sidenote if they don't exist
	 *
	 * @returns {Promise}
	 */
	async function annotate() {
		console.log('annotate command is pressed');

		// cfg.notesFolder = getNotesFolder(); // no necessary because we calculate cfg.notesFolder via getter

		const currentPos = getCurrentPosition();
		const currentUUID = getUUIDfromPosition(currentPos);

		if (currentUUID) { // if sidenote anchor already present on this line, open associated note
			openSidenote(currentUUID, true);
		} else { // else create comment and then open note
			const newUUID:string = await createAnchorComment(currentPos);
			openSidenote(newUUID, false);
		}
	}

	function display() {
		activateAnchors();
	}

	vscode.window.onDidChangeActiveTextEditor(
		editor => {
			activeEditor = editor;
			if (editor) {
				activateAnchors();
			}
		},
		null,
		context.subscriptions
	);

	// process sidenoted documents on close
	// vscode.workspace.onDidCloseTextDocument(async document => {
	// 	const uuid = getDocumentUUID(document);
	// 	if (uuid) {
	// 		const entry = sidenotesRegistry[uuid];
	// 		if (entry) {
	// 			const range = new vscode.Range(
	// 				new vscode.Position(entry.pos.line, 0),
	// 				new vscode.Position(entry.pos.line+1, 0)
	// 			);
	// 			await entry.editor.edit(edit => {
	// 				edit.delete(range);
	// 			}, {
	// 				undoStopAfter: false,
	// 				undoStopBefore: false
	// 			});
	// 			updateDecorations(entry.editor);
	// 		}
	// 	}

	// });

	// When a document is saved check to see if it a margin note
	// vscode.workspace.onDidSaveTextDocument(async document => {
		// const match = document.uri.fsPath.match(new RegExp(`.*\\${cfg.notesFolder}.(${UUID_REGEX})\.md`));
	// 	if (match) {
	// 		vscode.commands.executeCommand('workbench.action.closeActiveEditor');
	// 	}
	// });

	context.subscriptions.push(
		vscode.commands.registerCommand('sidenotes.annotate', annotate),
		vscode.commands.registerCommand('sidenotes.display', display)
	);
}


// this method is called when your extension is deactivated
export function deactivate() { console.log('Deactivating sidenotes') }
