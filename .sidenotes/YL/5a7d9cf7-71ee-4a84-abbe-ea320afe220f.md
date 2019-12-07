тут есть 2 варианта: проверять наличие папки при старте и каждый раз при открытии нового workspace (минус - тогда каждый раз при открытии workspace там будет создаваться папка)
OnDidChangeWorkspaceOptions
https://code.visualstudio.com/api/references/vscode-api#workspace
либо каждый раз перед созданием заметки (минус - каждый раз будет эта проверка)

из документации Node.js:
In general, check for the existence of a file only if the file won’t be used directly, for example when its existence is a signal from another process.
