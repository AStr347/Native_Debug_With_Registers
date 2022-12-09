import * as vscode from 'vscode';
import { debug, Event, EventEmitter, ProviderResult } from 'vscode';
import { RegisterValue } from '../backend/backend';
import { RegisterPair } from '../backend/mi2/mi2';

/**
 * A simple tree data provider to show registers.
 */
export class RegisterTreeProvider implements vscode.TreeDataProvider<RegisterNode> {
	private _onDidChangeTreeData: EventEmitter<RegisterNode | undefined | null | void> = new EventEmitter<RegisterNode | undefined | null | void>();
	public readonly onDidChangeTreeData: Event<RegisterNode | undefined | null | void> = this._onDidChangeTreeData.event;

	private registers: RegisterNode[] = undefined;
	private registerMap: { [index: number]: RegisterNode } = undefined;
	
	constructor() {}

  public getTreeItem(element: RegisterNode): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: RegisterNode): ProviderResult<RegisterNode[]> {
		if (element) {
			return [];
		}
		return this.registers || [];
	}

	public debugSessionStarted() {
		this.clear();
	}

	public debugSessionStoped() {
		this.refresh();
	}

	public debugSessionContinued() {
	}

	public debugSessionTerminated() {
		this.clear();
	}

	private clear() {
		this.registerMap = undefined;
		this.registers = undefined;
		this._onDidChangeTreeData.fire();
	}
	
	private refresh() {
		if (this.registers === undefined) {
			this.createRegisters();
		}
		
		debug.activeDebugSession.customRequest('get-register-values').then(data => {
			const registerValues: RegisterValue[] = data;
			registerValues.forEach(r => {
				const node = this.registerMap[r.index];
				if (node) {
					node.setValue(r.value);
				}
			});
			this._onDidChangeTreeData.fire();
		});
	}

	private createRegisters() {
		this.registers = [];
		this.registerMap = {};
		debug.activeDebugSession.customRequest('get-register-names').then(data => {
			(data as RegisterPair[]).forEach((reg) => {
				if (reg) {
					const register = new RegisterNode(reg.name, "-");
					this.registers.push(register);
					this.registerMap[reg.index] = register;
				}
			});
		});
	}
}

class RegisterNode extends vscode.TreeItem {
  constructor(public name: string, private value: string) {
    super(name + ": " + value);
	}

	public setValue(value: string) {
		this.value = value;
		this.tooltip = value;
		this.label = this.name + ": " + this.value;
	}
}