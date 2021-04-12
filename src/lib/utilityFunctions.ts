// 🕮 <cyberbiont> c5745bee-a5b1-4b45-966e-839fec3db57a.md
// 🕮 <cyberbiont> 4959862d-ffdd-4a7b-96a6-25811f2e54a9.md
export function addNestedProperty<
	B extends Record<string, any>,
	P extends string & RecursiveKeyOf<B>,
	V extends DeepType<B, P>
>(
	base: B,
	path: P,
	value: V,
	o: { overwrite: boolean } = { overwrite: true },
): B {
	// 🕮 <cyberbiont> 4a70100b-0779-488f-9667-b169b5fcb41e.md
	const properties = path.split('.') as Array<string & keyof B>;
	const lastProperty = properties.pop();
	if (!lastProperty)
		throw new Error('path argument must contain at least one property');

	function isObject(arg: unknown): arg is object {
		return typeof arg === 'object' && arg !== null;
	}

	const lastObj = properties.reduce((acc, property) => {
		// если приводим property к типу keyOf B, то получается индексировать им B,
		// но нельзя присвоить потом {} (т.к. B[keyof B] это хз что) поэтому придется к any привести пустой объект
		// если нет такого свойства, создаем объект
		if (!(property in acc)) acc[property] = {} as any;
		// если такое св-во есть, и это объект, все ОК возвращаем его
		// если св-во есть и это не объект, то выбрасываем ошибку, если запрещена перезапись св-в
		// по нормальному тут надо еще функции исключить, можно использовать lodash.isObject
		else if (!isObject(acc) && !o.overwrite)
			throw new Error('you are trying to overwrite existing property');
		return acc[property];
	}, base);

	lastObj[lastProperty] = value;
	return base;
}

// TEST
type Foo = {
	a?: {
		very: {
			deep: {
				property: number;
			};
		};
	};
	b: number;
};

const foo: Foo = {
	a: {
		very: {
			deep: {
				property: 4,
			},
		},
	},
	b: 2,
};

addNestedProperty(foo, 'a.very.deep.property', 2);

export function copyProperties(target: obj, source: obj): obj {
	for (let o = source; o !== Object.prototype; o = Object.getPrototypeOf(o)) {
		for (const name of Object.getOwnPropertyNames(o)) {
			if (name === 'constructor') continue;
			target[name] = o[name];
		}
	}
	return target;
}
