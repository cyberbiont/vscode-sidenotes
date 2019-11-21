import * as vscode from 'vscode';

export { EventEmitter } from 'events';
export { ICfg } from './cfg';
export { IEditorService } from './editorService';
export { IIdMaker } from './idMaker';
export { OApp } from './app';

export {
	IDictionary,
	HasIdProperty
} from './dictionary';

export {
	IDesignable,
	ODesigner,
	default as Designer,
} from './designer';

export {
	IAnchor,
	IAnchorable,
	OAnchorer,
	default as Anchorer,
} from './anchorer';

export {
	EditorUtils,
	MarkerUtils,
	OEditorUtils,
	OMarkerUtils,
} from './utils';

export {
	OFileSystem,
	default as FileSystem,
} from './fileSystem';

export {
	IFileStorage,
	IStorable,
	IStorageService,
	OFileStorage,
	OStorageService,
} from './storageService';

export {
	IScanData,
	default as Scanner,
} from './scanner';

export {
	IStylable,
	IStylableDecoration,
	OStyler,
	default as Styler,
} from './styler';

export {
	default as Pruner,
	// Prunable
} from './pruner';

export {
	default as MapRepository,
} from './mapRepository';

export {
	default as ReferenceContainer
} from './referenceContainer';

export {
	default as DocumentsController
} from './documentsController';

export { default as SidenoteProcessor } from './sidenoteProcessor';

export {
	ISidenote,
	Inspector,
	SidenoteFactory
} from './sidenote';

export {
	FileChangeTracker,
	IChangeData,
	IChangeTracker,
	OChangeTracker,
	OFileChangeTracker,
	OVscodeChangeTracker,
	VscodeChangeTracker,
} from './changeTracker';

export type Constructor<T = {}> = new (...args: any[]) => T;
export type AnyFunction<T = any> = (...input: any[]) => T
export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>

import {	Initializable } from './mixins';
import { IDictionary, MapDictionary, HasIdProperty } from './dictionary';
import DictionaryRepository from './dictionaryRepository';
import MapRepository from './mapRepository';
import Styler from './styler';
import { IScanData } from './scanner';
import { ISidenote } from './sidenote';

export type SidenotesDictionary
	= MapDictionary<ISidenote> & Initializable

export type DocumentInitializableSidenotesRepository
	=	MapRepository<
		vscode.TextDocument,
		SidenotesDictionary
	>;

export type SidenotesStyler = Styler<ISidenote>;
export type SidenotesRepository
	= DictionaryRepository<IScanData, ISidenote>;
