import * as vscode from "vscode";
import { IConfiguration } from "../../configuration";

export type TerminalWriter = vscode.EventEmitter<string>;

export abstract class TerraformCloudTaskTerminal implements vscode.Pseudoterminal {
  protected writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  protected closeEmitter = new vscode.EventEmitter<number>();
  onDidClose?: vscode.Event<number> = this.closeEmitter.event;
  protected config: IConfiguration;
  protected cancelTokenHandler: vscode.CancellationTokenSource;

  constructor(config: IConfiguration) {
    this.config = config;
    this.cancelTokenHandler = new vscode.CancellationTokenSource();
  }

  abstract doTask(
    initialDimensions: vscode.TerminalDimensions | undefined,
    token: vscode.CancellationToken
  ): Promise<void>;

  open(initialDimensions: vscode.TerminalDimensions | undefined): void {
    this.doTask(initialDimensions, this.cancelTokenHandler.token);
  }

  close(): void {
    this.cancelTokenHandler.cancel();
    // The terminal has been closed. Shutdown the build.
  }

  public dispose() {
    this.cancelTokenHandler.dispose();
  }

}
