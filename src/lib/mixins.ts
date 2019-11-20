import { Constructor } from './types';

export function Stateful<T extends Constructor>(Base: T) {
	return class extends Base {
		private state: boolean = false;

		setState(value: boolean): boolean {
			return this.state = value;
		}
		getState(): boolean {
			return this.state;
		}
		toggleState(): boolean {
			return this.state = !this.state;
		}
	};
}

export function Initializable<T extends Constructor>(Base: T) {
	return class extends Base {
		public isInitialized: boolean = false;
	};
}

// mixins 🕮 53cf7583-bd25-4fe2-9d6d-c81ddbf9e321
