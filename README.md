# textX vs code

**NOTE:** This project is deprecated. It is superseded by [textX-LS](https://github.com/textX/textX-LS).

This is a VS code extension which uses [textX-languageserver](https://github.com/textX/textx-languageserver).
It implements [Language Server Protocol](https://github.com/Microsoft/language-server-protocol).

Extension can be found on [marketplace](https://marketplace.visualstudio.com/items?itemName=danixeee.textx-ls).

## textX-ls extension in action

[![textX language server](https://img.youtube.com/vi/vAP5c7pwWiY/0.jpg)](https://www.youtube.com/watch?v=vAP5c7pwWiY)

## Configuration

### Manually adding path to python 3

If you are getting message "Python 3 is required!", you should try to manually add a path to python 3.

Go to File -> Preferences -> Settings (shortcut: `CTRL + Comma`) and in User or Workspace settings tab add a new key-value pair `"textxls.pythonPath": "PATH_TO_PYTHON3"`

### `.txconfig` file example

```textx
dsl Workflow [wf] {

	general {
		publisher: "test"
		version: "0.0.1"
	}

	paths {
		grammar: "workflow/workflow.tx"
		outline: "workflow/workflow.txol"
		coloring: "workflow/workflow.txcl"
	}
}
```

## Commands

Press F1 and start typing one of following commands:

- `Export metamodel to dot` (creates `dot` file for your grammar in projects root; textx command)
- `Export model to dot` (creates `dot` file for your model(s) in projects root; textx command)
- `Generate vscode extension` (generates vs code extension for language defined with `.txconfig`)

### Packaging and installing generated extension

If everything works fine, after invoking `Generate vscode extension` command, you should see new `gen` directory in your projects root.

1. Make sure you have [vsce](https://www.npmjs.com/package/vsce) installed on your machine (npm install -g vsce)
2. `cd gen`
3. `vsce package` - This will generate new `.vsix` file in gen directory
4. [Install extension](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix)

NOTE:

Generated vs code extensions have their own language server which are activated just on language specified in `.txconfig` file.

If you have both `textx-ls` and your generated extension installed, you should disable `textx-ls` extension or remove `.txconfig` file from workspace.

## Activation events, languages, commands, snippets

Please take a look at [package.json](https://github.com/textX/textX-vscode/blob/master/package.json)

## Building and running locally

1. Install dependencies `npm install`
2. In [extension.ts](https://github.com/textX/textX-vscode/blob/master/src/extension.ts) comment startLangServer and uncomment startLangServerTCP

```typescript
// START FOR PUBLISH
lsDisp = startLangServer(python, [textxls_main], []);

// START CLIENT TCP
// lsDisp = startLangServerTCP(5000);
context.subscriptions.push(lsDisp);
```

3. Be sure you run language server in tcp mode. [Steps to run language server](https://github.com/textX/textX-languageserver/blob/master/README.md)
4. Press F5
5. Open [examples] directory (https://github.com/textX/textX-languageserver/tree/master/examples)

Language server should start if you have valid `.txconfig` file in projects root.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

Fixed [vscode-language-server-node](https://github.com/Microsoft/vscode-languageserver-node) [bug](https://github.com/Microsoft/vscode-languageserver-node/pull/284)
