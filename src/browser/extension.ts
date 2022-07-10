import * as vscode from "vscode";
import * as common from '../common/extension';
import { setHttpRequestConstructor } from "../common/tfcApiExtensions/TfcClient";
import { FetchHttpRequest } from './tfcApi/core/FetchHttpRequest';

export function activate(context: vscode.ExtensionContext) {
  setHttpRequestConstructor(FetchHttpRequest);
  common.activate(context);
}

export function deactivate() {
  common.deactivate();
}
