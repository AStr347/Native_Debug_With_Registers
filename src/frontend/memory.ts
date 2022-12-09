import * as vscode from "vscode";
import * as net from "net";
import * as path from "path";
import * as os from "os";

export class MemoryContentProvider implements vscode.TextDocumentContentProvider {
	provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Thenable<string> {
		return new Promise((resolve, reject) => {
			const conn = net.connect(path.join(os.tmpdir(), "code-debug-sockets", uri.authority.toLowerCase()));
			let from, to;
			let highlightAt = -1;
			const splits = uri.query.split("&");
			if (splits[0].split("=")[0] == "at") {
				const loc = parseInt(splits[0].split("=")[1].substring(2), 16);
				highlightAt = 64;
				from = Math.max(loc - 64, 0);
				to = Math.max(loc + 768, 0);
			} else if (splits[0].split("=")[0] == "from") {
				from = parseInt(splits[0].split("=")[1].substring(2), 16);
				if (splits[1].split("=")[0] == "to") {
					to = parseInt(splits[1].split("=")[1].substring(2), 16);
				} else if (splits[1].split("=")[0] == "length") {
					to = from + parseInt(splits[1].split("=")[1]);
				} else return reject("Invalid Range");
			} else return reject("Invalid Range");
			if (to < from)
				return reject("Negative Range");
			conn.write("examineMemory " + JSON.stringify([from, to - from + 1]));
			conn.once("data", data => {
				let formattedCode = "                  00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F\n";
				let index: number = from;
				const hexString = data.toString();
				let x = 0;
				let asciiLine = "";
				let byteNo = 0;
				for (let i = 0; i < hexString.length; i += 2) {
					if (x == 0) {
						let addr = index.toString(16);
						while (addr.length < 16) addr = '0' + addr;
						formattedCode += addr + "  ";
					}
					index++;

					const digit = hexString.substring(i, i + 2);
					const digitNum = parseInt(digit, 16);
					if (digitNum >= 32 && digitNum <= 126)
						asciiLine += String.fromCharCode(digitNum);
					else
						asciiLine += ".";

					if (highlightAt == byteNo) {
						formattedCode = formattedCode.slice(0, -1) + "[" + digit + "]";
					} else {
						formattedCode += digit + " ";
					}

					if (x == 7)
						formattedCode += " ";

					if (++x >= 16) {
						formattedCode += " " + asciiLine + "\n";
						x = 0;
						asciiLine = "";
					}
					byteNo++;
				}
				if (x > 0) {
					for (let i = 0; i <= 16 - x; i++) {
						formattedCode += "   ";
					}
					if (x >= 8)
						formattedCode = formattedCode.slice(0, -2);
					else
						formattedCode = formattedCode.slice(0, -1);
					formattedCode += asciiLine;
				}
				resolve(center("Memory Range from 0x" + from.toString(16) + " to 0x" + to.toString(16), 84) + "\n\n" + formattedCode);
				conn.destroy();
			});
		});
	}
}

function center(str: string, width: number): string {
	let left = true;
	while (str.length < width) {
		if (left) str = ' ' + str;
		else str = str + ' ';
		left = !left;
	}
	return str;
}
