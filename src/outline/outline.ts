import { Range, Event, EventEmitter, ExtensionContext, SymbolKind, SymbolInformation, TextDocument, TextEditor, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands, window, workspace, Uri, Position, Location, Selection, TextEditorRevealType } from 'vscode';
import * as path from 'path'
import * as fs from 'fs'

class Node {
    type: string;
    label: string;
    icon: string;
    children: Array<Node>;
    start_line: number;
    start_point_in_line;
    end_line;
    end_point_in_line;
    state?: TreeItemCollapsibleState;
}

export class CodeOutline implements TreeDataProvider<Node> {
    private _onDidChangeTreeData: EventEmitter<Node | null> = new EventEmitter<Node | null>();
    readonly onDidChangeTreeData: Event<Node | null> = this._onDidChangeTreeData.event;
    private context: ExtensionContext;
    private tree: Node;
    private editor: TextEditor;
    private nodes: Array<Node>;
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

    private updateSymbols(editor:TextEditor) {
    if (editor) {
            commands.executeCommand('outline.refresh', {'uri': editor.document.uri}).then(
                (results) => {
                    this.nodes = JSON.parse(results as string);
                    let root = new Node();
                    root.children = this.nodes;
                    this.initNodesState(root, root);
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
        commands.registerCommand('codeOutline.revealRange', (editor: TextEditor, node: Node) => {
            const range = new Range(new Position(node.start_line, node.start_point_in_line), new Position(node.end_line, node.end_point_in_line));
            editor.revealRange(range, TextEditorRevealType.Default);
            editor.selection = new Selection(range.start, range.end);
            commands.executeCommand('workbench.action.focusActiveEditorGroup');
            changeNodeRange(node);
        });
        function changeNodeRange(node: Node) {
            if (node.state == TreeItemCollapsibleState.Collapsed) {
                node.state = TreeItemCollapsibleState.Expanded
            } else if(TreeItemCollapsibleState.Expanded) {
                node.state = TreeItemCollapsibleState.Collapsed
            }
        }
    }

    private initNodesState(root: Node, node: Node) {
        if (node.type != null && node.label != null) {
            let index =  this.getNodeIndex(root, node);
            let state = this.getState(node.type, node.label, index, node.children.length > 0);
            if (state == null) {
                state = this.getTreeItemCollapsibleState(node.children.length > 0);
            } else {
                node.state = state;
            }
        }
        for (let i = 0; i < node.children.length; i++) {
            this.initNodesState(root, node.children[i]);
        }
    }

    private getNodeIndex(root: Node, node: Node): number {
        let counter = 0;
        if (root.type == node.type && root.label == node.label) {
            if(root.state != null) {
                counter++;
            }
        }
        for (let item of root.children) {
            counter += this.getNodeIndex(item, node);
        }
        return counter;
    }

    private getState(type: string, name: string, index: number, hasChildren: boolean, currentNode?: Node): TreeItemCollapsibleState {
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
        else if(name == currentNode.label && type == currentNode.type) {
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

    async getChildren(node?: Node): Promise<Node[]> {
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

    getTreeItem(node: Node): TreeItem {
        let treeItem = new TreeItem(node.label);
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