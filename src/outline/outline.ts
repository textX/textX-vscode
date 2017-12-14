import { Range, Event, EventEmitter, ExtensionContext, SymbolKind, SymbolInformation, TextDocument, TextEditor, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands, window, workspace, Uri, Position, Location, Selection, TextEditorRevealType } from 'vscode';
import * as path from 'path'
import * as fs from 'fs'

export class SymbolNode {
    type: string
    symbol: SymbolInformation;
    icon: string;
    children?: SymbolNode[];
    state?: TreeItemCollapsibleState;

    constructor(type?: string, symbol?: SymbolInformation, icon?: string) {
        this.type = type;
        this.symbol = symbol;
        this.icon = icon;
        this.children = [];
    }

    addChild(child: SymbolNode) {
        this.children.push(child);
    }

    setState(state: TreeItemCollapsibleState) {
        this.state = state;
    }
}

export class CodeOutline implements TreeDataProvider<SymbolNode> {
    private _onDidChangeTreeData: EventEmitter<SymbolNode | null> = new EventEmitter<SymbolNode | null>();
    readonly onDidChangeTreeData: Event<SymbolNode | null> = this._onDidChangeTreeData.event;
    private context: ExtensionContext;
    private tree: SymbolNode;
    private editor: TextEditor;
    private nodes: Array<SymbolNode>;
    private stateCounter;

    constructor(context: ExtensionContext) {
        this.context = context;
        this.customizeEvents();
        this.updateSymbols(window.activeTextEditor);
        this.registerCommands();
    }

    private customizeEvents() {
        window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.updateSymbols(window.activeTextEditor);
            }
        });
        workspace.onDidOpenTextDocument(document => {
            this.updateSymbols(window.activeTextEditor);
        });
        workspace.onDidSaveTextDocument(document => {
            if (document === this.editor.document) {
                this.updateSymbols(window.activeTextEditor);
            }
        });
        workspace.onDidChangeTextDocument(document => {
            this.updateSymbols(window.activeTextEditor);
        });
    }

    private async updateSymbols(editor:TextEditor): Promise<void> {
    if (editor) { 
            commands.executeCommand('outline.refresh').then(
                (results) => {
                    this.nodes = new Array();
                    let nodes = this.makeTree(JSON.parse(results as string));
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
    }

    private registerCommands() {
        let codeOutline = this;
        window.registerTreeDataProvider('codeOutline', codeOutline);
        commands.registerCommand('codeOutline.refresh', () => {
            codeOutline.refresh()
        });
        commands.registerCommand('codeOutline.revealRange', (editor: TextEditor, node: SymbolNode) => {
            const range = new Range(node.symbol.location.range.start, node.symbol.location.range.end);
            editor.revealRange(range, TextEditorRevealType.Default);
            editor.selection = new Selection(range.start, range.end);
            commands.executeCommand('workbench.action.focusActiveEditorGroup');
            changeNodeRange(node);
        });
    
        function changeNodeRange(node: SymbolNode) {
            if (node.state == TreeItemCollapsibleState.Collapsed) {
                node.setState(TreeItemCollapsibleState.Expanded);
            } else if(TreeItemCollapsibleState.Expanded) {
                node.setState(TreeItemCollapsibleState.Collapsed);
            }
        }
    }

    private makeTree(array: JSON): Array<SymbolNode> {
        var count = Object.keys(array).length;
        let nodes = new Array<SymbolNode>();
        for (let i = 0; i < count; i++) {
            let json = array[i];
            let range = new Range(new Position(json['start_line'], json['start_point_in_line']),
                                new Position(json['end_line'], json['end_point_in_line']));
            let location = new Location(null, range);
            let information = new SymbolInformation(json['label'], SymbolKind.Null, '', location);
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

    private getNodeIndex(node: SymbolNode) {
        let counter = 0;
        for (let item of this.nodes) {
            if (item.type == node.type && item.symbol.name == node.symbol.name) {
                counter++;
            }
        }
        this.nodes.push(node);
        return counter;
    }

    private getState(type: string, name: string, index: number, hasChildren: boolean, currentNode?: SymbolNode): TreeItemCollapsibleState {
        if (!hasChildren) {
            return TreeItemCollapsibleState.None;
        }
        if (this.tree == null) {
            return this.getTreeItemCollapsibleState(hasChildren);
        }
        if (currentNode == null) {
            currentNode = this.tree;
            this.stateCounter = 0;
        }
        else if(name == currentNode.symbol.name && type == currentNode.type) {
            if (index == this.stateCounter) {
                if (hasChildren && currentNode.state == TreeItemCollapsibleState.None) {
                    return TreeItemCollapsibleState.Collapsed;
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

    private getTreeItemCollapsibleState(hasChildren: boolean): TreeItemCollapsibleState {
        if (hasChildren) {
            return TreeItemCollapsibleState.Collapsed;
        }
        else {
            return TreeItemCollapsibleState.None;
        }
    }

    async getChildren(node?: SymbolNode): Promise<SymbolNode[]> {
        if (node) {
            return node.children;
        } else {
            return this.tree ? this.tree.children : [];
        }
    }

    private getIcon(icon: string): string {
        if (icon == undefined) {
            icon = "default.png";
        }
        if (path.isAbsolute(icon)) {
            return icon;
        } else {
            return this.context.asAbsolutePath(path.join('resources', 'icons', icon));
        }
    }

    getTreeItem(node: SymbolNode): TreeItem {
        let treeItem = new TreeItem(node.symbol.name);
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