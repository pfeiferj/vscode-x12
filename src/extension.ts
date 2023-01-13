// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import Parser from 'web-tree-sitter'
import { highlights } from './query'
import * as path from 'path';
import { exec } from "child_process";
import Convert from 'ansi-to-html';
var convert = new Convert({escapeXML: true});

const symbolTypeMap: Record<string,string> = {
  "type": "type",
  "punctuation.delimiter": "punctuation",
}


let sitter: [Parser, Parser.Query] | null = null
async function parserInit () {
  await Parser.init();
  const parser = new Parser();
  let langFile = path.join(__dirname, "../", 'tree-sitter-x12.wasm');
  const X12 = await Parser.Language.load(langFile);
  parser.setLanguage(X12);
  const query = X12.query(highlights)
  sitter = [parser, query]
}
parserInit()


const tokenTypes = Object.values(symbolTypeMap);
const legend = new vscode.SemanticTokensLegend(tokenTypes);


const provider: vscode.DocumentSemanticTokensProvider = {
  provideDocumentSemanticTokens(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    // analyze the document and return semantic tokens

    const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
    if(!sitter) {
      return tokensBuilder.build();
    }
    const [parser, query] = sitter;
    const tree = parser.parse(document.getText())
    const captures = query.captures(tree.rootNode)

    captures.forEach(capture => {
      if(!symbolTypeMap[capture.name]) return
      tokensBuilder.push(
        new vscode.Range(new vscode.Position(capture.node.startPosition.row, capture.node.startPosition.column), new vscode.Position(capture.node.endPosition.row, capture.node.endPosition.column)),
        symbolTypeMap[capture.name] || capture.name
      );
    })
    return tokensBuilder.build();
  }
};


const selector = { language: 'x12', scheme: 'file' }; // register for all x12 documents from the local file system

vscode.languages.registerDocumentSemanticTokensProvider(selector, provider, legend);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {}

// This method is called when your extension is deactivated
export function deactivate() {}
