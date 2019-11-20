import * as vscode from 'vscode';
import { IDictionary } from './dictionary';
import { ISidenote } from './sidenote';
import MapPoolDriver from './mapPoolDriver';
import Styler from './styler';
import DictionaryPoolDriver from './dictionaryPoolDriver';
import { IScanData } from './scanner';


export { OApp } from './app';

export { IIdMaker } from './idMaker';

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
	default as FileSystem,
	OFileSystem,
} from './fileSystem';

export {
	// IFileStorageCfg
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
	default as MapPool,
	// PoolDictionary,
	// PoolWeakMap,
} from './mapPoolDriver';

export {
	default as Actual
} from './actualKeeper';

export {
	default as DocumentsController
} from './documentsController';

// export {
// 	Stateful,
// 	TrackingActive
// } from './mixins'

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

export { IEditorService } from './editorService';
export { ICfg } from './cfg'

export { EventEmitter } from 'events';

import { Initializable } from './mixins';

export type Constructor<T = {}> = new (...args: any[]) => T;

export type SidenotesDictionary = IDictionary<ISidenote> & { isInitialized: boolean };
export type DocumentsPoolDriver = MapPoolDriver<
	vscode.TextDocument,
	IDictionary<ISidenote>
>;
// export type SidenotesPool = PoolDictionary<ISidenote>;
export type SidenotesStyler = Styler<ISidenote>;
export type SidenotesPoolDriver = DictionaryPoolDriver<IScanData, ISidenote>;
// export type sidenotesDictsPool = PoolWeakMap<vscode.TextDocument, IDictionary<ISidenote>>
