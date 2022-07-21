import * as vscode from "vscode";
import * as tfc from './tfcApi';
import { IConfiguration } from "./configuration";
import * as tfchelper from "./tfcHelpers";

export interface ITfcSession {
  organizationId: string;
  onChangeOrganization: vscode.Event<tfc.Organization | undefined>

  watchingWorkspaceId: string;
  watchingWorkspace: tfc.Workspace | undefined;
  isWatchingWorkspace: boolean;
  watchWorkspaceId(id?: string): void
  onWatchingWorkspace: vscode.Event<tfc.Workspace | undefined>
}

export class TfcSession implements ITfcSession {
  private orgEmitter = new vscode.EventEmitter<tfc.Organization | undefined>();
  onChangeOrganization: vscode.Event<tfc.Organization | undefined> = this.orgEmitter.event;

  private watchingWorkspaceEmitter = new vscode.EventEmitter<tfc.Workspace | undefined>();
  onWatchingWorkspace: vscode.Event<tfc.Workspace | undefined> = this.watchingWorkspaceEmitter.event;

  private config: IConfiguration;
  private _organizationId: string = "";
  private _organization?: tfc.Organization;
  private _watchingWorkspaceId: string = "";
  private _watchingWorkspace?: tfc.Workspace;

  public get organizationId() {
    return this._organizationId;
  }

  public set organizationId(id: string) {
    this._organizationId = id;
    this._organization = undefined;
    this.getOrganization();
  }

  public get isWatchingWorkspace(): boolean {
    return this._watchingWorkspaceId !== "" && this._watchingWorkspace !== undefined;
  }

  public get watchingWorkspace(): tfc.Workspace | undefined {
    return this._watchingWorkspace;
  }

  public get watchingWorkspaceId() {
    return this._watchingWorkspaceId;
  }

  public watchWorkspaceId(id?: string): Promise<void> {
    this._watchingWorkspaceId = id || "";
    this._watchingWorkspace = undefined;
    return this.getWatchingWorkspace();
  }

  // public watchWorkspaceName(name: string): Promise<void> {
  //   this._watchingWorkspaceId = "";
  //   this._watchingWorkspace = undefined;
  //   return this.getWatchingWorkspaceByName(name);
  // }

  public async init(): Promise<void> {
    this._organizationId = ""; // this.config.organization || "";
    this._watchingWorkspaceId = "";
    return this.getOrganization();
  }

  private async getOrganization(): Promise<void> {
    //TODO: Needs error trapping
    const client = await tfchelper.createClient(this.config);
    try {
      this._organization = await tfchelper.getOrganization(
        client,
        this._organizationId,
        true
      );
      this.orgEmitter.fire(this._organization);
    } catch (e: any) {
      if (e.message === "Unauthorized") {
        vscode.window.showErrorMessage(
          "Failed to get the selected Organization. You need to use an Access Token that has access to all organizations. Please sign out and try again."
        );
      }
      throw e;
    }
  }

  private async getWatchingWorkspace(): Promise<void> {
    //TODO: Needs error trapping
    const client = await tfchelper.createClient(this.config);
    try {
      this._watchingWorkspace = await tfchelper.getWorkspace(
        client,
        this._watchingWorkspaceId,
        true
      );
      this.watchingWorkspaceEmitter.fire(this._watchingWorkspace);
    } catch (e: any) {
      if (e.message === "Unauthorized") {
        vscode.window.showErrorMessage(
          "Failed to get the selected Organization. You need to use an Access Token that has access to all organizations. Please sign out and try again."
        );
      }
      throw e;
    }
  }

  // private async getWatchingWorkspaceByName(workspaceName: string): Promise<void> {
  //   //TODO: Needs error trapping
  //   const client = await tfchelper.createClient(this.config);
  //   try {
  //     this._watchingWorkspace = await tfchelper.getWorkspaceByName(
  //       client,
  //       this._organizationId,
  //       workspaceName
  //     );
  //     this._watchingWorkspaceId = this._watchingWorkspace?.id || "";
  //     this.watchingWorkspaceEmitter.fire(this._watchingWorkspace);
  //   } catch (e: any) {
  //     if (e.message === "Unauthorized") {
  //       vscode.window.showErrorMessage(
  //         "Failed to get the selected Organization. You need to use an Access Token that has access to all organizations. Please sign out and try again."
  //       );
  //     }
  //     throw e;
  //   }
  // }

  constructor(config: IConfiguration) {
    this.config = config;
  }
}
