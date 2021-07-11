import { Cfg } from './cfg';
import UserInteraction from './userInteraction';

export type OUserInteraction = {
	anchor: {
		marker: {
			defaultSignature: string;
			signatures: string[];
		};
	};
};

export default class Signature {
	public subfolderName!: string;
	public active!: string;

	constructor(public userInteraction: UserInteraction, public cfg: Cfg) {
		this.setActive(this.cfg.anchor.marker.defaultSignature);
	}

	setActive(signature: string) {
		this.active = signature;
		this.subfolderName = this.getSignatureSubfolderName(signature);
	}

	async switchActiveSignature() {
		const newSignature = await this.userInteraction.selectSignature(
			this.active,
		);
		if (newSignature) this.setActive(newSignature);
	}

	getSignatureSubfolderName(signature: string) {
		return signature;
	}
}
