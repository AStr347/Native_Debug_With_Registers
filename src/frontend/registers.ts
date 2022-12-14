import * as vscode from 'vscode';
import { debug, Event, EventEmitter, ProviderResult } from 'vscode';
import { RegistersTable } from '../backend/mi2/registerstable';

/**
 * A simple tree data provider to show registers.
 */
export class RegisterTreeProvider implements vscode.TreeDataProvider<RegisterNode> {
	private _onDidChangeTreeData: EventEmitter<RegisterNode | undefined | null | void> = new EventEmitter<RegisterNode | undefined | null | void>();
	public readonly onDidChangeTreeData: Event<RegisterNode | undefined | null | void> = this._onDidChangeTreeData.event;
	private registers: RegisterNode[] = undefined;
	constructor() { }

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
		this.registers = undefined;
		this._onDidChangeTreeData.fire();
	}

	private refresh() {
		if (this.registers === undefined) {
			this.createRegisters();
		}

		debug.activeDebugConsole.appendLine("get-register-values called");
		debug.activeDebugSession.customRequest('get-register-values').then(data => {
			const registers: RegistersTable = data;
			const names = this.registers.map(x => x.name);
			registers.regs.forEach(r => {
				const index = names.indexOf(r.name);
				this.registers[index].setValue(r.value);
			}
			);
			this._onDidChangeTreeData.fire();
		});
	}

	private createRegisters() {
		this.registers = [];
		debug.activeDebugConsole.appendLine("get-register-names called");
		debug.activeDebugSession.customRequest('get-register-names').then(data => {
			const registers: RegistersTable = data;
			registers.regs.forEach(r => {
				const register = new RegisterNode(r.name, "-");
				this.registers.push(register);
			}
			);
		}
		);
	}
}

class RegisterNode extends vscode.TreeItem {
	constructor(public name: string, private value: string) {
		super(name + " : " + value);
	}

	public setValue(value: string) {
		this.tooltip = value;
		if (true == isNumeric(value)) {
			const num = Number.parseInt(value);
			this.value = '0x' + num.toString(16) + ' | ' + num.toString(2);
		} else {
			this.value = value;
		}
		this.label = this.name + " : " + this.value;
	}
}

function isNumeric(val: unknown): val is string | number {
	const isFin = isFinite(Number(val));
	const parceres = Number.parseFloat(String(val));
	const isN = isNaN(Number(parceres));
	return (!isN && isFin);
}
