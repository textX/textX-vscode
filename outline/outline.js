"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
class SymbolNode {
    constructor(type, symbol, icon) {
        this.type = type;
        this.symbol = symbol;
        this.icon = icon;
        this.children = [];
    }
    addChild(child) {
        this.children.push(child);
    }
    setState(state) {
        this.state = state;
    }
}
exports.SymbolNode = SymbolNode;
class CodeOutline {
    constructor(context) {
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.context = context;
        this.customizeEvents();
        this.updateSymbols(vscode_1.window.activeTextEditor);
        this.registerCommands();
    }
    registerCommands() {
        let codeOutline = this;
        vscode.window.registerTreeDataProvider('outline', codeOutline);
        codeOutline.refresh();
        vscode.commands.getCommands().then((cmds) => {
            if (!cmds.some(x => x === 'codeOutline.revealRange')){
                vscode.commands.registerCommand('codeOutline.revealRange', (editor, node) => {
                    const range = new vscode.Range(node.symbol.location.range.start, node.symbol.location.range.end);
                    editor.revealRange(range, vscode.TextEditorRevealType.Default);
                    editor.selection = new vscode.Selection(range.start, range.end);
                    vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
                    changeNodeRange(node);
                });
                function changeNodeRange(node) {
                    if (node.state == vscode.TreeItemCollapsibleState.Collapsed) {
                        node.setState(vscode.TreeItemCollapsibleState.Expanded);
                    }
                    else if (vscode.TreeItemCollapsibleState.Expanded) {
                        node.setState(vscode.TreeItemCollapsibleState.Collapsed);
                    }
                }
            }
        });
    }
    customizeEvents() {
        vscode_1.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.updateSymbols(vscode_1.window.activeTextEditor);
            }
        });
        vscode_1.workspace.onDidOpenTextDocument(document => {
            this.updateSymbols(vscode_1.window.activeTextEditor);
        });
        vscode_1.workspace.onDidSaveTextDocument(document => {
            if (document === this.editor.document) {
                this.updateSymbols(vscode_1.window.activeTextEditor);
            }
        });
        vscode_1.workspace.onDidChangeTextDocument(document => {
            this.updateSymbols(vscode_1.window.activeTextEditor);
        });
    }
    updateSymbols(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor) {
                vscode.commands.executeCommand('outline.refresh').then(
                    (results) => {
                        this.nodes = new Array();
                        let nodes = this.makeTree(JSON.parse(results));
                        let root = new SymbolNode();
                        var count = Object.keys(nodes).length;
                        for (let i = 0; i < count; i++) {
                            root.addChild(nodes[i]);
                        }
                        this.tree = root;
                        this.refresh();
                    },
                    (err) => console.log(err)
                )
                this.editor = editor;
            }
        });
    }
    makeTree(array) {
        var count = Object.keys(array).length;
        let nodes = new Array();
        for (let i = 0; i < count; i++) {
            let json = array[i];
            let range = new vscode_1.Range(new vscode_1.Position(json['start_line'], json['start_point_in_line']), new vscode_1.Position(json['end_line'], json['end_point_in_line']));
            let location = new vscode_1.Location(null, range);
            let information = new vscode_1.SymbolInformation(json['label'], vscode_1.SymbolKind.Null, '', location);
            let node = new SymbolNode(json['type'], information, json['icon']);
            let children = this.makeTree(json['children']);
            let state = this.getState(json['type'], json['label'], this.getNodeIndex(node), children.length > 0);
            if (state == null) {
                state = this.getTreeItemCollapsibleState(children.length > 0);
            }
            node.setState(state);
            for (let child of children) {
                node.addChild(child);
            }
            nodes.push(node);
        }
        return nodes;
    }
    getNodeIndex(node) {
        let counter = 0;
        for (let item of this.nodes) {
            if (item.type == node.type && item.symbol.name == node.symbol.name) {
                counter++;
            }
        }
        this.nodes.push(node);
        return counter;
    }
    getState(type, name, index, hasChildren, currentNode) {
        if (!hasChildren) {
            return vscode_1.TreeItemCollapsibleState.None;
        }
        if (this.tree == null) {
            return this.getTreeItemCollapsibleState(hasChildren);
        }
        if (currentNode == null) {
            currentNode = this.tree;
            this.stateCounter = 0;
        }
        else if (name == currentNode.symbol.name && type == currentNode.type) {
            if (index == this.stateCounter) {
                if (hasChildren && currentNode.state == vscode_1.TreeItemCollapsibleState.None) {
                    return vscode_1.TreeItemCollapsibleState.Collapsed;
                }
                return currentNode.state;
            }
            this.stateCounter++;
        }
        for (let i = 0; i < currentNode.children.length; i++) {
            let state = this.getState(type, name, index, hasChildren, currentNode.children[i]);
            if (state != null) {
                return state;
            }
        }
        return null;
    }
    getTreeItemCollapsibleState(hasChildren) {
        if (hasChildren) {
            return vscode_1.TreeItemCollapsibleState.Collapsed;
        }
        else {
            return vscode_1.TreeItemCollapsibleState.None;
        }
    }
    getChildren(node) {
        return __awaiter(this, void 0, void 0, function* () {
            if (node) {
                return node.children;
            }
            else {
                return this.tree ? this.tree.children : [];
            }
        });
    }
    getIcon(icon) {
        if (icon == undefined) {
            icon = "default.png";
        }
        if (path.isAbsolute(icon)) {
            return icon;
        }
        else {
            return this.context.asAbsolutePath(path.join('resources', 'icons', icon));
        }
    }
    getTreeItem(node) {
        let treeItem = new vscode_1.TreeItem(node.symbol.name);
        treeItem.collapsibleState = node.state;
        treeItem.command = {
            command: 'codeOutline.revealRange',
            title: '',
            arguments: [
                this.editor,
                node
            ]
        };
        treeItem.iconPath = this.getIcon(node.icon);
        return treeItem;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
}
exports.CodeOutline = CodeOutline;
//# sourceMappingURL=codeOutline.js.map