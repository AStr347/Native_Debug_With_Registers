import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { MemoryContentProvider } from './memory';
import { RegisterTreeProvider } from './registers';

export function activate(context: vscode.ExtensionContext) {
	return new CodeDebugExtension(context);
}

export class CodeDebugExtension {
	private registerProvider: RegisterTreeProvider;

	constructor(private context: vscode.ExtensionContext) {
		this.registerProvider = new RegisterTreeProvider();

		context.subscriptions.push(
			vscode.workspace.registerTextDocumentContentProvider("debugmemory", new MemoryContentProvider()),
			vscode.commands.registerCommand("code-debug.examineMemoryLocation", examineMemory),
			vscode.commands.registerCommand("code-debug.getFileNameNoExt", () => {
				if (!vscode.window.activeTextEditor || !vscode.window.activeTextEditor.document || !vscode.window.activeTextEditor.document.fileName) {
					vscode.window.showErrorMessage("No editor with valid file name active");
					return;
				}
				const fileName = vscode.window.activeTextEditor.document.fileName;
				const ext = path.extname(fileName);
				return fileName.substring(0, fileName.length - ext.length);
			}),
			vscode.commands.registerCommand("code-debug.getFileBasenameNoExt", () => {
				if (!vscode.window.activeTextEditor || !vscode.window.activeTextEditor.document || !vscode.window.activeTextEditor.document.fileName) {
					vscode.window.showErrorMessage("No editor with valid file name active");
					return;
				}
				const fileName = path.basename(vscode.window.activeTextEditor.document.fileName);
				const ext = path.extname(fileName);
				return fileName.substring(0, fileName.length - ext.length);
			}),
			vscode.window.createTreeView('code-debug.registers', {
				treeDataProvider: this.registerProvider
			}),
			vscode.debug.onDidStartDebugSession(this.debugSessionStarted.bind(this)),
			vscode.debug.onDidTerminateDebugSession(this.debugSessionTerminated.bind(this)),
			vscode.debug.onDidReceiveDebugSessionCustomEvent(this.debugSessionCustomEventReceived.bind(this)),
		);
	}

	private debugSessionStarted(e: vscode.DebugSession) {
		this.registerProvider.debugSessionStarted();
	}

	private debugSessionTerminated(e: vscode.DebugSession) {
		this.registerProvider.debugSessionTerminated();
	}

	private debugSessionCustomEventReceived(e: vscode.DebugSessionCustomEvent) {
		switch (e.event) {
			case 'custom-stopped':
				this.registerProvider.debugSessionStoped();
				break;

			case 'custom-continued':
				this.registerProvider.debugSessionContinued();
				break;

			default:
				break;
		}
	}
}

const memoryLocationRegex = /^0x[0-9a-f]+$/;

function getMemoryRange(range: string) {
	if (!range)
		return undefined;
	range = range.replace(/\s+/g, "").toLowerCase();
	let index;
	if ((index = range.indexOf("+")) != -1) {
		const from = range.substring(0, index);
		let length = range.substring(index + 1);
		if (!memoryLocationRegex.exec(from))
			return undefined;
		if (memoryLocationRegex.exec(length))
			length = parseInt(length.substring(2), 16).toString();
		return "from=" + encodeURIComponent(from) + "&length=" + encodeURIComponent(length);
	} else if ((index = range.indexOf("-")) != -1) {
		const from = range.substring(0, index);
		const to = range.substring(index + 1);
		if (!memoryLocationRegex.exec(from))
			return undefined;
		if (!memoryLocationRegex.exec(to))
			return undefined;
		return "from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to);
	} else if (memoryLocationRegex.exec(range))
		return "at=" + encodeURIComponent(range);
	else return undefined;
}

function examineMemory() {
	const socketlists = path.join(os.tmpdir(), "code-debug-sockets");
	if (!fs.existsSync(socketlists)) {
		if (process.platform == "win32")
			return vscode.window.showErrorMessage("This command is not available on windows");
		else
			return vscode.window.showErrorMessage("No debugging sessions available");
	}
	fs.readdir(socketlists, (err, files) => {
		if (err) {
			if (process.platform == "win32")
				return vscode.window.showErrorMessage("This command is not available on windows");
			else
				return vscode.window.showErrorMessage("No debugging sessions available");
		}
		const pickedFile = (file) => {
			vscode.window.showInputBox({ placeHolder: "Memory Location or Range", validateInput: range => getMemoryRange(range) === undefined ? "Range must either be in format 0xF00-0xF01, 0xF100+32 or 0xABC154" : "" }).then(range => {
				vscode.window.showTextDocument(vscode.Uri.parse("debugmemory://" + file + "?" + getMemoryRange(range)));
			});
		};
		if (files.length == 1)
			pickedFile(files[0]);
		else if (files.length > 0)
			vscode.window.showQuickPick(files, { placeHolder: "Running debugging instance" }).then(file => pickedFile(file));
		else if (process.platform == "win32")
			return vscode.window.showErrorMessage("This command is not available on windows");
		else
			vscode.window.showErrorMessage("No debugging sessions available");
	});
}
