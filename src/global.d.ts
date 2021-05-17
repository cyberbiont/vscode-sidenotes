declare type Optional<T> = T | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type Constructor<T = AnyObject> = new (...args: any[]) => T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type AnyFunction<T = any> = (...input: any[]) => T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type AnyObject = Record<string, any>;

declare type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>;

declare type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

declare type Split<S extends string, D extends string = `.`> = string extends S
	? string[]
	: S extends ``
	? []
	: S extends `${infer T}${D}${infer U}`
	? [T, ...Split<U, D>]
	: [S];
// const str = 'foo.bar.baz';
// const a = str.split('.') as Split<typeof str, '.'>;

declare type PathToObject<Path extends string, V> =
	Path extends `${infer T}.${infer U}`
		? {
				[prop in T]: PathToObject<U, V>;
		  }
		: { [prop in Path]: V };

declare type DeepType<T, S extends string> = T extends AnyObject
	? S extends `${infer Key}.${infer NextKey}`
		? Key extends keyof T
			? DeepType<T[Key], NextKey>
			: false
		: S extends keyof T
		? T[S]
		: never
	: T;

declare type RecursiveKeyOf<TObj extends AnyObject> = {
	[TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<
		TObj[TKey],
		`${TKey}`
	>;
}[keyof TObj & (string | number)];
type RecursiveKeyOfInner<TObj extends AnyObject> = {
	[TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<
		TObj[TKey],
		RecursiveKeyOfAccess<TKey>
	>;
}[keyof TObj & (string | number)];
type RecursiveKeyOfHandleValue<TValue, Text extends string> =
	TValue extends AnyObject
		? Text | `${Text}${RecursiveKeyOfInner<TValue>}`
		: Text;
type RecursiveKeyOfAccess<TKey extends string | number> =
	| `['${TKey}']`
	| `.${TKey}`;
