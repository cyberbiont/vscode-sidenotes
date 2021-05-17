import { DictionaryRepository, MapRepository } from './repository';
import { HasEditorReference, Initializable } from './mixins';
import { Sidenote, SidenoteFactoryOptions } from './sidenote';

import Decorator from './decorator';
import { MapDictionary } from './dictionary';
import { TextDocument } from 'vscode';

export type SidenotesDictionary = MapDictionary<Sidenote> &
	Initializable &
	HasEditorReference;

export type DocumentInitializableSidenotesRepository = MapRepository<
	TextDocument,
	SidenotesDictionary
>;

export type SidenotesDecorator = Decorator;

export type SidenotesRepository = DictionaryRepository<
	SidenoteFactoryOptions,
	Sidenote
>;
