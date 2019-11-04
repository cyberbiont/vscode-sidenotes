import * as vscode from 'vscode';
import {
	IAnchor,
	MarkerUtils,
	ActiveEditorUtils
} from './types';

export interface IScanResultData {
	id: string,
	markerStartPos?: vscode.Position
}

export default class Scanner {
	constructor(
		public markerUtils: MarkerUtils,
		public activeEditorUtils: ActiveEditorUtils
	) {}
	// we should convert indexes to position at once,
	// otherwise it will differ depending on was line matched or whole document
	getIdsFromText(
		text: string = this.activeEditorUtils.editor.document.getText()
	): IScanResultData[]|undefined {
		const match = text.match(this.markerUtils.bareMarkerRegex);
		// предусматриваем в дальнейшем возможность передачи index вместе с id, когда перейдем на метод MatchAll
		const result: IScanResultData[] = [];
		if (match) {
			match.forEach(el => result.push({
				id: this.markerUtils.getIdFromMarker(el)
			}));
			return result;
		} else {
			return undefined;
		}
	}

	rescanLineForMarkerRange(anchor: IAnchor, positionHint: vscode.Position): vscode.Range {
		const line = this.activeEditorUtils.getTextLine(positionHint);
		let scanResult = this.scanLine(line)!;
		return this.markerUtils.getMarkerRange(anchor, scanResult.markerStartPos);
	}

	scanLine(line: vscode.TextLine): IScanResultData|undefined {
		if (line.isEmptyOrWhitespace) return undefined;
		const match = line.text.match(this.markerUtils.bareMarkerRegexNonG);
		if (match && match.index) {
			return {
				id: this.markerUtils.getIdFromMarker(match[0]),
				markerStartPos: line.range.start.translate({ characterDelta: match.index - this.markerUtils.getPrefixLength() })
			}
		}
	}

	getFromCurrentLine(): IScanResultData|undefined {
		if (!this.activeEditorUtils.getWorkspaceFolderPath()) {
			throw new Error('Files outside of a workspace cannot be annotated.');
		}
		const line = this.activeEditorUtils.getTextLine();

		const scanResult = this.scanLine(line);
		if (scanResult) return scanResult;
		return undefined;
		//TODO support several notes in one line, open depending on cursor position
	}


}
