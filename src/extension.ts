'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';
import path = require('path');
import { readdirSync, readFileSync } from 'fs';

const TERM_NAME = "python - ok";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposables = [
        vscode.commands.registerCommand('okpy.question', async () => {
            let result = await getQuestion();
            let okterm = getTerminal();
            okterm.sendText(`python3 ok -q ${result}`);
        }),
        vscode.commands.registerCommand('okpy.questionUnlock', async () => {
            let result = await getQuestion();
            let okterm = getTerminal();
            okterm.sendText(`python3 ok -q ${result} -u`);
        }),
        vscode.commands.registerCommand('okpy.allUnlock', async () => {
            let okterm = getTerminal();
            okterm.sendText(`python3 ok -u`);
        }),
        vscode.commands.registerCommand('okpy.all', async () => {
            let okterm = getTerminal();
            okterm.sendText(`python3 ok`);
        }),
        vscode.commands.registerCommand('okpy.submit', async () => {
            let okterm = getTerminal();
            okterm.sendText(`python3 ok --submit`);
        })
    ];

    for (let d of disposables) {
        context.subscriptions.push(d);
    }
}

async function getQuestion() {

    let dir = getCwd();
    if (!dir) {
        return;
    }
    let okFile = readdirSync(dir).find(x => x.endsWith(".ok"));

    let throwErr = false;
    try {
        if (okFile) {
            let obj = JSON.parse(readFileSync(path.join(dir,okFile), 'utf8'));
            let tests = Object.keys(obj.tests);
            for (let i = 0; i < tests.length; i++) {
                let matches = tests[i].match(/(.*\/)?(\w+).py:?(\w+)?/)!;
                tests[i] = matches[3] || matches[2];
            }

            const test = await vscode.window.showQuickPick(tests);
            if(!test) {
                throwErr = true;
                throw new Error("No question provided");
            }
            return test;
        }
    }
    catch (err) {
        if(throwErr) {
            throw err;
        } else {
            console.error(err);
        }
    }

    const result = await vscode.window.showInputBox({
        prompt: "Enter question name",
        value: ""
    });

    if (!result) {
        throw new Error("No question provided");
    }

    return result;
}

function getTerminal(name = TERM_NAME, setCwd = true, setFocus = true) {
    let term = vscode.window.terminals.find(x => x.name === name);
    term = term || vscode.window.createTerminal(name);
    if (setCwd) {
        setTerminalCwd(term);
    }
    if (setFocus) {
        term.show(false);
    }
    return term;
}

// ### Code from https://github.com/Tyriar/vscode-terminal-here ###

function kindOfShell(terminalSettings: vscode.WorkspaceConfiguration) {
    if (os.platform() !== 'win32') {
        return;
    }

    const windowsShellPath = terminalSettings.integrated.shell.windows;

    if (!windowsShellPath) {
        return undefined;
    }

    // Detect WSL bash according to the implementation of VS Code terminal.
    // For more details, refer to https://goo.gl/AuwULb
    const is32ProcessOn64Windows = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
    const system32 = is32ProcessOn64Windows ? 'Sysnative' : 'System32';
    var shellKindByPath: any = {};
    shellKindByPath[path.join(process.env.windir!, system32, 'bash.exe').toLowerCase()] = "wslbash";
    shellKindByPath[path.join(process.env.windir!, system32, 'cmd.exe').toLowerCase()] = "cmd";

    // %windir% can give WINDOWS instead of Windows
    return shellKindByPath[windowsShellPath.toLowerCase()];
}

function setTerminalCwd(terminal: vscode.Terminal) {
    let dir = getCwd();
    if (!dir) {
        return;
    }

    switch (kindOfShell(vscode.workspace.getConfiguration('terminal'))) {
        case "wslbash":
            // c:\workspace\foo to /mnt/c/workspace/foo
            dir = dir.replace(/(\w):/, '/mnt/$1').replace(/\\/g, '/');
            break;
        case "cmd":
            // send 1st two characters (drive letter and colon) to the terminal
            // so that drive letter is updated before running cd
            terminal.sendText(dir.slice(0, 2));
    }

    terminal.sendText(`cd "${dir}"`);
}

function getCwd() {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    let document = editor.document;
    if (!document) {
        return;
    }

    let uri = document.uri;
    if (!uri) {
        return;
    }

    return path.dirname(uri.fsPath);
}

// ### END https://github.com/Tyriar/vscode-terminal-here ###

// this method is called when your extension is deactivated
export function deactivate() {
}