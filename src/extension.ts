import * as vscode from 'vscode';
import { FormatEnvironment, TextEdit, formatPhpEdits, optionsFromGetter } from './core';

const SECTION = 'dhcConverter.php';

function compute(document: vscode.TextDocument, options: vscode.FormattingOptions, range?: vscode.Range): vscode.TextEdit[] {
    const config = vscode.workspace.getConfiguration(SECTION, { uri: document.uri, languageId: 'php' });
    const formatOptions = optionsFromGetter((path) => config.get(path));
    const env: FormatEnvironment = {
        insertSpaces: options.insertSpaces,
        tabSize: options.tabSize,
        eol: document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n',
    };

    const source = document.getText();
    const result = formatPhpEdits(source, formatOptions, env);
    if (!result.ok) {
        void vscode.window.showWarningMessage(`DHC PHP Converter: ${result.reason}`);
        return [];
    }

    let edits: TextEdit[] = result.edits;
    if (range) {
        const from = document.offsetAt(range.start);
        const to = document.offsetAt(range.end);
        edits = edits.filter((e) => e.anchor >= from && e.anchor <= to);
    }
    return edits.map((e) =>
        vscode.TextEdit.replace(new vscode.Range(document.positionAt(e.start), document.positionAt(e.end)), e.newText),
    );
}

export function activate(context: vscode.ExtensionContext): void {
    const selector: vscode.DocumentSelector = { language: 'php' };
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(selector, {
            provideDocumentFormattingEdits: (document, options) => compute(document, options),
        }),
        vscode.languages.registerDocumentRangeFormattingEditProvider(selector, {
            provideDocumentRangeFormattingEdits: (document, range, options) => compute(document, options, range),
        }),
    );
}

export function deactivate(): void { }
