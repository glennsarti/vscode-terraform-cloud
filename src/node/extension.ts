import * as vscode from "vscode";
import * as common from '../common/extension';
import { setHttpRequestConstructor } from "../common/tfcApiExtensions/TfcClient";
import { AxiosHttpRequest } from './tfcApi/core/AxiosHttpRequest';

export function activate(context: vscode.ExtensionContext) {
  setHttpRequestConstructor(AxiosHttpRequest);
  common.activate(context);
}

export function deactivate() {
  common.deactivate();
}
