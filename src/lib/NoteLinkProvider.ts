import { DocumentLink, DocumentLinkProvider, Position, ProviderResult, Range, TextDocument, Uri } from "vscode";
import Scanner from "./scanner";
import { EditorUtils, MarkerUtils } from './utils';

export class NoteLinkProvider implements DocumentLinkProvider {
  constructor(
    private utils: MarkerUtils & EditorUtils,
  ) {}
  provideDocumentLinks(document: TextDocument): ProviderResult<DocumentLink[]> {
    const scanner = new Scanner(document, this.utils);
    const scanData = scanner.scanText(document.getText()) || [];
    const links: DocumentLink[] = [];
    for (const data of scanData) {
      const { ranges } = data;
      const uriEncodedScanData = encodeURIComponent(
        JSON.stringify({ onHoverScanData: data }),
      );
      const editCommandUri = Uri.parse(
        `command:sidenotes.annotate?${uriEncodedScanData}`,
      );
      for (const range of ranges) {
        const editLink = new DocumentLink(range, editCommandUri);
        links.push(editLink);
      }
    return new Promise((res) => res(links));
  }
}
}