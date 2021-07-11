import { QuickPickItem, window } from 'vscode';

import { Cfg } from './cfg';
import Errors from './errors';

export type OUserInteraction = {
	anchor: {
		marker: {
			defaultSignature: string;
			riggedSignatures: Set<string>;
		};
	};
};

export type ExtensionSelectionDialogTypes = `input` | `pick`;

export default class UserInteraction {
	constructor(private cfg: Cfg, private errors: Errors) {}

	async selectSignature(
		currentlyActiveSignature: string,
		placeholder = undefined,
	) {
		const { riggedSignatures: signatures } = this.cfg.anchor.marker;

		if (signatures.size < 2) {
			window.showInformationMessage(
				`you have less than two signature defined in settings`,
			);
			return undefined;
		}

		const response = await window.showQuickPick(
			Array.from(signatures)
				.filter(signature => !(signature === currentlyActiveSignature))
				.map(signature => ({
					label: signature,
				})),
			{
				placeHolder: placeholder ?? `⚙ ${currentlyActiveSignature}`,
			},
		);

		if (!response)
			throw new this.errors.InteractionError(
				`User canceled signature selection`,
			);
		else return response.label;
	}

	async promptExtension(dialogType: ExtensionSelectionDialogTypes = `input`) {
		let extension: string | undefined;

		if (dialogType === `pick`) {
			const action = await window.showQuickPick(
				this.cfg.storage.files.extensionsQuickPick.map(ext => ({
					label: ext,
				})),
				{
					placeHolder: `choose extension of the content file to be created`,
				},
			);
			extension = action?.label;
		} else {
			extension = await window.showInputBox({
				prompt: `Enter extension for your content file (without dot)`,
				value: `md`,
			});
		}

		return extension;
	}

	async promptUserForAction(lookup?: AnyFunction) {
		const actions: QuickPickItem[] = [
			{
				label: `delete`,
				description: `delete note comment`,
			},
			{
				label: `re-create`,
				description: `re-create storage entry for this note comment`,
			},
		];

		if (lookup)
			actions.push({
				label: `lookup`,
				description: `look for the missing sidenote file (select folder)`,
			});

		const chosen = await window.showQuickPick(actions, {
			placeHolder: `No corresponding content file is found in workspace sidenotes folder. What do you want to do?`,
		});

		return chosen;
	}
}
