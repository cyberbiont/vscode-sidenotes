# Sidenotes

Externalize your comments.

## Features

This extension provides you an inobtrusive way to annotate your code with external notes, that are stored separately from your document and are shown in pop-ups on hover.

- create, edit and delete sidenotes, anchored to certain line in your code;
- preview their contents in tooltips;
- tooltips automatically update as you edit and save your note;
- annotate any text file format that supports comments;
- edit notes in VScode or open them right away in your favourite Markdown editor;
- create notes with any custom extension, and open them with default system application (docx, mind maps...)
- use multiple anchors for the same note;
- automatically transfer selected fragment to the note being created (see [Externalizing content](#Externalizing-content));
- automatically enclose moved fragment in appropriate code fence;
- keep your notes under VCS along with the code they annotate or exclude them (see [VCS considerations](#VCS-considerations));
- notes are workspace/project based, but you can migrate them to new project (see [Housekeeping](#Housekeeping));

## Motivation

Many times we all heard a saying that good code documents itself. To a certain extent it's true, but sometimes you need to make some extended notes regarding to particular part of your code, that it just can't say for itself. A common case is describing *why* your wrote your code in such a way to remember later and don't make the same mistake twice.  There also could be some ideas, detailed 'todos', issue analysis, conclusions, alternative code variants or something alike that you what to recall later when revising your code . How should you manage this information?

Comments are usually the poor tool for this job. Too many / too large comments clutter your code and make it hard to concentrate on the code itself. But delete them - and you may miss some important point later. Unfortunately, VSCode has no way to hide/fold all comments.

The other consideration is privacy. There may be notes that are private in nature and are not intended to be seen for other people, who might happen to read / edit your code. With usual comments there's no usual way to help it, if your code is commited under VCS other than delete them altogether. So, the only solution is to 'externalize' your notes but keep them anchored to certain lines of your code so that you can easily peek/edit them at any time.

## How it works

Sidenotes content are stored in separate files ('*content files*'), that are linked to the source document via the special comments in your code(*anchor* comments). 'Content' side and 'source' document side are linked via the common unique id that is read from anchor comment and is used to fetch associated content from content file.

## Supported extensions and languages

### source document

The extension uses VSCode 'toggle comment' action to generate anchors, so it allows extension to be agnostic about what language the document you are annotating is written in. Therefore, you can annotate any file format that allows comments inside it. You can even technically annotate sidenotes themselves with another sidenotes!

Nevertheless, it is recommended to set some restrictions as to what kind of files can be annotated, to speed up workspace-wide scan (which is performed by 'housekeeping' commands perform, for example) by excluding certain extensions and directories. You can do it with appropriate glob (see [Files filter](#Files-filter)).

### content files

Usually Markdown is the best choice for a simple sidenote, since it allows for simple editing and useful features such as code fences and syntax highliting.  So `.md` file is what is created on default when you add new sidenote. You can set exact extension for file in defautContentFileExtension setting.

### images

If you want to display an image or some other type of html-supported content, you can do so by stuffing it inside markdown file.
For local files, you should place the files you are attaching into '${filename}.assets' subdirectory in your notes subfolder.

Doing so will exclude these files so they won't appear as 'stray' when cleaning-up your content directory.

You can do it manually or there is an option to do exactly that in Typora. `Preferences - images - copy image to ./${filename}.assets`

Take care thought, that if you happen to just move image link from one sidenote to another without changing .assets folder where it resides, you'll loose correct files association.

Simple absolute paths do not work for markdown images in Vscode. You have several options:

- To be able to preview image in VScode (in Markdown preview window or by opening on Alt-Click) you have to use relative path. There an option for this in Typora. But image inserted in this way will not show up in hover tooltip.

- Your second option is to use URI. Uncheck "relative path" option and enable "auto escape image URL".  You'll also have to manually add file:/// at the beginning of the uri. Note that this will break some of Typora functionality (you won't be able to open file's directory, for example).
This method will allow the image to show up in the tooltip, but unfortunately it won't be visible in preview. You can still use Alt-Click to open it.

Linking images with URL works fine.
<!-- 🕮 <YL> 1574a389-2783-4446-bebf-c92589dd05f6.md -->

## Commands

#### Annotate

The main command that is used for both creating new and opening existing sidenotes (depending on whether you use it on the line that already contains sidenote), so you can use just one convenient key binding for both. If called over existing sidenote anchor, it opens associated content file for editing.

When creating new note, if no text is selected, a new line is created above current cursor position and anchor marker is placed there. In selection is made, it is transferred to created file, and all selected lines are replaced with sidenote marker line.

If resource is not found, running this command displays a dialog window, where you can choose from several options:

- *delete sidenote* - deletes orphaned anchor comment
- *re-create* - creates new file for this anchor comment keeping id;
- *look-up* - opens file browser for you to select directory where file is contained (See [Migrating notes](#Migrating-notes-to-new-project)).

#### Annotate (Code)

Same as annotate, but if used with selection made, automatically creates codeFence for this selection in Markdown file (see [Externalizing content](#Externalizing content)).

#### Annotate (Input Extension)

Same as annotate, but when creating new note, presents you with an input field where you can type in custom extension for your content file.

#### Annotate (Input Extension)

Same as annotate, but when creating new note, presents you with a dropdown list of extensions so you can select the one you need. List options can be edited in [configuration](#extensionsQuickPick)

#### Delete

Deletes both content file and all associated anchors from current document. (See [Deleting sidenotes](#Deleting-sidenotes)).

#### Wipe anchor

Deletes comment anchor (without deleting content file). Can be useful if you have several anchors for one note and want to delete one of them.

#### Refresh

Resets decorations for document, rescans and rebuilds them (in case If something has gone awry).

<!-- 🕮 8373285c-2587-414b-be3a-eedf42b1b4cd -->

#### Prune broken

Command is used to delete all broken notes in current document.

#### Prune empty

Command is used to delete all empty notes in current document.

#### Clean Up

Searches for extraneous (orphan) and stray (accidental) content records in your storage and prompts you to delete them. (See [housekeeping](#Cleaning-extraneous-and-stray-files))

#### Migrate

Searches for 'broken' comment anchors and performs global lookup for missing content files. (See [migrating notes](#Migrating-notes-to-new-project))

#### Toggle markers

Toggles visibility of markers. If you set full markers visisble by default in configuration, this command will hide them instead.

## Configuration options

All configuration settings must be prepended with 'sidenotes.' in your settings.json, ex. 'sidenotes.hoverToolbar'.

<!-- 🕮 9c424c17-95db-4d86-83f2-8441a487868e -->

### App settings

#### hoverToolbar

*default: true*

The extension uses vscode.hoverProvider to show convinience button links at the bottom of the tooltip.
This (probably) can slow thing down a little so if you don't need it you can turn this off.

Note that due to no negation support in VSCode glob patterns and namely document selectors, your [filter](#filter) settings will not have effect here, so hover butoons toolbar will be working in all files.

<!-- 🕮 <YL> 007d8c93-429b-4927-a89e-5cd9a972d20c.md -->

#### defaultMarkdownEditor

*default: "vscode"*

The default editor that will be used to open your sidenotes that use markdown file formats. The available options are:

##### vscode

By default, sidenote will open in vscode's rightmost panel for editing.

##### system default

The sidenote will open in whatever program is specified in your OS as default for the content file extension. Uses ['Open'](https://www.npmjs.com/package/opn) npm module for cross-platform compatibility.

##### typora

To use this option, you must have Typora installed in your system and 'typora' executable in the system PATH.

Typora is a special case due to some problems that don't allow to open it from Vscode as system default editor (at least on Windows).  So I wrote special extension to let you do this.
Generally, I recommend you use to leave VScode as default and resort to Typora when you need extensive editing, using open-in-typora extension.

### Workspace Filter

vscode GlobPattern (relative to your workspace folder) to specify files and directories which your want to be available for annotation. Files excluded by filter are not scanned for anchors and cannot be annotated.  See [vscode.GlobPattern](https://code.visualstudio.com/api/references/vscode-api#GlobPattern) for syntax details.

#### filter.include

*default: "**/\*"*

vscode GlobPattern to specify files and directories which your want to be available for annotation.

#### filter.exclude

*default: "\*\*/{node_modules,.git,.idea,target,out,build,vendor}/\*\*/\*"*

vscode GlobPattern to exclude files and directories which your don't want to be annotated. Glob is inverted automatically so you don't have to prepend ! here.

### Storage

#### notesSubfolder

*default: ".sidenotes"*

if the File Storage is used (which is by default) defines a subfolder inside your workspace, where content files will be stored. Note that inside this directory another subdirectory is created, named after your signature setting. This is done to separate notes by different authors.

#### defaultContentFileExtension

*default: ".md"*

Default extension for content files. You can change it to whatever you like, but Markdown is recommended.

#### extensionsQuickPick

*default: []*

List of extensions available for quick pick when using Annotate (Pick) command.

<!-- 🕮 8533ec55-0f8d-4531-a1c4-b7d754f55eae -->

### Anchor configuration

The extension uses certain Regex, based on unique id, to identify sidenote anchors in your source document and operate on them.

<!-- 🕮 71802268-2689-47c0-92b7-76d787c42419 -->

<!-- 🕮 c220a6fb-1c9f-4eab-9d43-cf4786c06a31 -->

### Signature

If you collaborate with your colleague, who also uses Sidenotes, your files may contain sidenotes markers from both you and your colleague (*'foreign'* markers). Without signature setting, they all will be handled by extension. This has disadvantages:
* you may want to distinguish your own notes only;
* if your colleague decided to make his notes private and did not commit them to VCS, his sidenotes will appear to have 'broken' status, and, actions like 'prune broken' will potentially delete your colleague's sidenote markers.
Specifying your signature guarantees that extension will only process your 'signatured' sidenote markersand leave alone all others.

If you and your colleague want to share sidenotes, no problem: you can either use some common signature when authoring, for example, 'Shared' , or none at all. Or each can add his colleague's signature to his `anchor.marker.signature.read` settings.

If you want to change signature, you can manully edit signature of marker in document.

#### signatureFilter

*default: false*

This is an array of signatures that you want to be processed when looking for sidenote markers in document. If this setting is not set, all signatures are processed.

Youtr own signature is automatically added to filter so that it is always corresponds to signature setting and always proccesed.

#### readUnsigned

*default: true*

Whether to process markers that have no signature.

#### signature

*default:  your username (defined in OS)*

This will be your signature that will be written down with every comment. Specifired string is added to the beginning of the marker, that will be included in search RegExp.  Signature helps in understanding to whom the sidenote belongs to, even when extension is inactive.
Your signature, if specified, is automatically added to signatureFilter array.

#### prefix

*default: undefined*

Adds the string that you specify here at the beginning of the inserted marker and removes it on sidenote deletion. Note that in constrast to 'before' setting this is the actual text that will be added, i.e. it is a part of the document and it will be visible when extension is deactivated.

It will be written in your document but will not affect Regex search.

Useful if you want to hook your sidenotes to some comment-styling extension (see [styling](#Prefixing-and-additional-styling-your-sidenotes)).

#### design.before

*default: undefined*

adds the string that you specify as a pseudo-element at the start of all of your markers. So it's plainly decorative and you cannot hook-up any external extensions on it.

#### design.after

*default: "🕮"*

Is shown at the end of the marker, and stays in place of it when the marker is compressed. You can change the default Unicode symbol to your own string or Unicode symbol here. Changes color to visualize sidenote's state.

You can use some funky Unicode emoji here, but note that they cannot change color, so to track sidenote  status you'll need gutter icons.
If you aim for true minimalism, you can use simple Unicode symbol and turn off gutter icons.

#### design.gutterIcon

Whether to show icons in gutter. If you don't like them or use other extension which shows gutter icons (see [styling](#Prefixing-and-additional-styling-your-sidenotes)) you can turn this off.

#### design.ruler

Whether sidenotes will be shown in Overview ruler

#### design.hideMarkers

Effectively hides the uuid part of markers to reduce cluttering by applying a negative letter-spacing to marker decoration.  See [Hiding ids](#Hiding ids)

#### design.colorIndication

Array of strings that defines what elements will change color, indicating sidenote status. Available values are "after", "text", "ruler".


<!-- 🕮 95145323-445c-4960-b3dc-c6e1a3c14fde -->

## Deleting sidenotes

`delete` command deletes both content file and all associated anchors in current document without asking confirmation.  In case you regret your decision, you can restore your content file from recycle bin or via VCS (if your sidenotes are under VCS control).

There may be times that you don't want to delete the content file (for example, you have another associated anchors that point to it) and want to delete only anchor. Technically in this case you can manually delete it (easily done with Ctrl-Shift-K shortcut - delete line action), but in this way decorations will not be updated and you may end up with residual artefacts. For this reason `Wipe` command exists that wipes current anchor only, leaving content file and other anchors inctact.

## Hiding ids

Uuids in anchor comments are necessary, but not the most pleasant thing to see in your code. By default extension hides them (in fact, compresses) so they are not visible and 'after' pseudoelement is displayed in place of an anchor. This has a one downside, that is precise selecting marker by dragging the mouse becomes a non-trivial task. To overcome this,  use Ctrl-C - Ctrl-X commands to copy / cut the whole line containing anchor marker, since in VSCode you don't have to select the whole line in order to cut/copy/delete it.

You can use `showMarkers`  command to unfold full markers.

## Externalizing content

For you convenience, when you create new sidenote, if you have some text selected, this text is removed from your document and placed inside sidenote, so you don't have to cut and paste it by hand.

Special `annotate (code)` command variation additionally wraps your content in code fence with language derived from document.

<!-- 🕮 67770c08-4054-4622-b980-03d8e762ff61 -->

## Prefixing and additional styling your sidenotes

### Manual commenting

You can manually type in some short charasteristic description for your note (before or after it). It will look like this:

`// a short description: 🕮`

This can be used to make certain sidenotes stand out, if your prefix sidenote with !, ? etc. special characters and use one of comment-styling vscode extensions.  I recommend [Better comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments) or [Deco comments](https://marketplace.visualstudio.com/items?itemName=GuillaumeIsabelle.gixdeko-comments) for this purpose.

### Prefixing all sidenotes

You can use [prefix](#anchor.marker.prefix) option to prepend some text to all of your sidenotes. It is essentially the same as above, but automatically made for all your sidenotes. This option can be useful in conjunction with [Comment anchors](https://marketplace.visualstudio.com/items?itemName=ExodiusStudios.comment-anchors)  extension to make all your sidenotes show up in comment anchors' navigation pane, if you set your prefix to one of predefined comment anchor types, such as 'NOTE '.

You can also do this, making use of integrated unicode uuid prefix.  To do so, you'll have to create create custom anchor type in comment anchor settings.json like this:

```json
"commentAnchors.tags.list": [
    {
        "tag": "🕮",
        "iconColor": "blurple",
        "highlightColor": "#896afc",
        "scope": "file"
    }
]
```

## Multiple anchors for the same sidenote

You can can have more than one anchor for content file, if you manually copy anchor comment.

Repeating anchors in the same document will be highlighted with colored dotted border for easier discerning (its color is randomly generated for each group).

When you delete sidenote with `delete` command, all repetitive anchors in current document with the same ID are also deleted. Note that after this if there are other relevant anchors left elsewhere in your project, they will receive 'broken' status as their content file will be deleted. You can then deal with them as you like (see [Housekeeping](#Housekeeping)).

To delete only one of anchors use `wipe` command.

## Housekeeping

By default, local directory inside your workspace folder is used to store notes. This lets you put your sidenotes under VCS control and commit them with the rest of your project (see VCS). However, because storage is workspace-bound,  this imposes some difficulties, one of them is the need to migrate your notes, if you want to move/copy your source document to another project/workspace.

Note that in order for extension with file storage used to work, you need to have workspace open in VSCode. You cannot annotate documents that are outside of (one of) currently opened workspace folder(s) - if you try, the extension will warn you.

### Broken notes

*Broken* sidenote is defined as note, for which there's a leftover comment anchor in your source document, but associated content file is missing. Extension automatically detects such notes and highlights them in red. When you are trying to open 'broken' sidenote. There' s a couple of options opened for you. You can:

- re-create missing file
- delete broken comment
- look for missing sidenote file

In latter case you have to specify the directory when the sidenote is stored through 'open file' dialog. Make sure you select the directory that *immideately* contains the file (nested files are not detected).

You also can use `prune broken` command, that will delete all broken sidenote anchors from current document.

### Empty sidenotes

*Empty* sidenote is defined as note, which content file is empty. Those are automatically detected and highlighted in orange. You can use `prune empty` command, to delete these notes from current document together with content files.

### Migrating notes to new project

There will be times you'll want to move your files to another project. If you just do it without copying sidenotes directory with them, you will  left up with broken notes.  To manage this, `migrate` command exists. It:

- scans all anchors and content files in the current workspace folder(s)
- informs you if any 'broken' sidenotes were found
- proposes you to specify directory in which missing content files are contained
- tries to find their content files in the directory that you specify.

So, the proposed order of actions when migrating annotated files to new project is as follows:

- you move/copy some annotated files into another project;
- you open this project as workspace in VScode;
- you run 'migrate' command and specify for lookup the former sidenotes folder from the project you have moved you files from.
- extension checks sidenotes in your current workspace and copies needed content files to your new new project.
- then you can run `clean up` command on your original project in order to delete any content files left that are not used anymore.

### Cleaning extraneous and stray files

If there are content files left in your sidenotes subfolder that are not associated with any anchors in your project folder files, those are defined as *extraneous*. You can run `clean up` command to detect and optionally delete them (extension will first report about extraneous files and then ask your confirmation to delete them).

There's also a *stray* files category which is also covered by `clean up` command in the same manner. Those are files (and folders also), which name does not contain valid id (that may accidentally end up in your sidenotes subfolder for whatever reason). Note that at this time it is prepostulated that content files are placed directly in sidenotes subfolder, so any nested folders are considered stray (so you cannot manually re-order content files in subdirectories).

### Other storage types (to be implemented)

Potentially, note's contents can be stored in centralized database or cloud service (such as Evernote). This has some benefits, (no need to migrate your files between projects) but makes sidenotes independent of VCS control (see VCS considerations).

## VCS considerations

It's up to you whether you want to commit your sidenotes to VCS or leave them off. Commiting has the benefit that any repositiory version you checkout with VCS will have sidenotes in accordance to this version state. It is useful if sidenote is coupled tightly with the code and you want to keep ot 'in sync' with annotated document.  Therefore, it is generally recommended. But, your notes won't be private that way (one way to help it is to use something like [node-cipher](https://www.npmjs.com/package/node-cipher) to encrypt your notes folder).

You can also exclude your sidenotes folder from VCS. In that case, you get notes privacy (they won't be commited and therefore shared with other collaborators through VCS), but you are at risk of getting 'extraneous'  or 'broken' notes if you check out the version where sidenote anchor still doesn't exist, or, otherwise, still exists though you could have deleted note and content file in one of later versions. However, if you really want the sidenote to be independent of VCS, it's the way to go.

However, if you want to exclude, it is recommended that you do it via global [git exclude](https://help.github.com/en/github/using-git/ignoring-files#explicit-repository-excludes) rather than .gitignore.

## Removing anchors during build

If your workflow involves some kind of biuld process, usually you'll want to delete sidenote comments during build process.

If you do it on 'delete-all-comments' basis, using your minifier, for example, sidenote comments will be deleted together with all others (since they are just simple comments).

If you want to delete sidenote comments only, you'll probably match them with Regexp.

<!-- 🕮 <YL> e800c2f1-f019-40d6-a8e7-a0dfab16a2aa.md -->

## Requirements

For 'typora' setting to work, you need Typora installed on your system and typora.exe in your system PATH.

## Known Issues  /  Gotchas

### Anchor comments will be present in your code.

The only way all this can work is comment anchors must be persisted in your code, there's no help for it.

It's not really big problem, since Sidenotes are intended to use in development only and if your code undergoes some sort of build process or minification, when comments are usually deleted from your code (see [Removing anchors during build](#Removing anchors during build)).

But, if you collaborate on code with other people who aren't acquainted with sidenite comments, in order to not scare them too much with uuids in tyou code, it can be a good idea to place some explanation/warning in your repository README so that your collaborators ignore these comments and won't delete them (but if they do, though, you can restore it via VCS).

### Manually moving / cutting / copying markers

When you manually move / copy / paste your anchor markers, the decorations need to be updated to account for the new marker position, until then they will be rendered at their old position.

Sadly, VSCode currently has no way of detecting cut events, so the closest event you can get after moving your marker is the document change event, which happens after you paste your text. On this event extension will scan changes and update decorations if any markers are involved. So, when you cut fragment of code that contains sidenote markers, the decorations will stay in their old place until you paste your code / switch editors.

Also, 'undo' in vscode doesn't trigger 'editor change' event, so if after undoing adding new sidenote, you may have to manually `refresh` decorations. Any way, 'undo' is not recommended in this case, because it will leave content file in place, so if you changed your mind after creating sidenote, better `delete` it.

#### Moving to document with another syntax

Obviously, if you want to move your sidenote to other file, that uses different comment syntax (according to language used), you'll have to manually edit comment to match (tip: untoggle comment before moving, then toggle back after);



Since sidenotes scanning is done lazily, you have to make editor active to initialize it. This can be seen on application start if you have several editors visible simultaneosly in different panes.

Anyway, in case of unpredictable rendering artefacts you can use `refresh` command to re-draw sidenotes decorations, and report about the issue on Github so I can fix it.

## Credits

Though extension concept idea occured to me independently, some initial implementation ideas came from [marginalia](https://marketplace.visualstudio.com/publishers/jamesnorton)
by [James Norton](https://marketplace.visualstudio.com/publishers/jamesnorton)

<div>Icon made by <a href="https://www.flaticon.com/authors/kiranshastry" title="Kiranshastry">Kiranshastry</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
## By me a beer:
