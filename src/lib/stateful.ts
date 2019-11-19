export default class Stateful<T> {
	private state: boolean = false;
	constructor(
		public object: T,
		public stateName: string
	) {}

	setState(value: boolean): boolean {
		return this.state = value;
	}
	getState(): boolean {
		return this.state;
	}
	toggleState(): boolean {
		return this.state = !this.state;
	}
}
export function createStatefulProxy<T>(thing: T, stateName: string) {
	return new Proxy(new Stateful<T>(thing, stateName), {
		get(target, prop) {
			const activeTarget = prop in target ? target : target.object;
			return Reflect.get(activeTarget as object, prop);
		}
	}) as Stateful<T> & T;
}
