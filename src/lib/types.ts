export { IIdMaker } from './idMaker';

export {
	IDictionary,
	IHasIdProperty
} from './dictionary';

export {
	default as Designer,
	IDesignerCfg,
	IDesignable
} from './designer';

export {
	default as Anchorer,
	IAnchor,
	IAnchorerCfg,
	IAnchorable
} from './anchorer';

export {
	IActiveEditorUtilsCfg,
	IMarkerUtilsCfg,
	ActiveEditorUtils,
	MarkerUtils
} from './utils';

export {
	IStorable,
	IStorageService,
	IFileStorage,
	IFileStorageCfg
} from './storageService';

export {
	default as Scanner,
	IScanResultData
} from './scanner';

export {
	default as Styler,
	IStylableDecorations,
	IStylerCfg,
	IStylable,
} from './styler';

export {
	default as Pruner,
	// Prunable
} from './pruner';

export { default as SidenoteProcessor } from './sidenoteProcessor';

export {
	ISidenote,
	Inspector,
	SidenoteFactory
} from './sidenote';

export {
	IChangeTrackerCfg,
	IFileChangeTrackerCfg,
	IVscodeChangeTrackerCfg,
	IChangeTracker,
	FileChangeTracker,
	VscodeChangeTracker,
	IChangeData
} from './changeTracker';

export { IEditorService } from './editorService';
export { ICfg } from './cfg'

export { EventEmitter } from 'events';
