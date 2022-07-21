import * as vscode from "vscode";
import * as tfc from '../tfcApi';
import * as tfchelper from "../tfcHelpers";

// Organization
export class OrganizationPickItem implements vscode.QuickPickItem {
  label: string;
  orgId: string;

  constructor(org: tfc.Organization) {
    this.label = org.id;
    this.orgId = org.id;
  }
}

export type OrganizationSelectionCallback = (result: OrganizationPickItem | undefined) => void;

export class OrganizationSelectionProvider {
  static async select(client: tfc.TfcClient, callback: OrganizationSelectionCallback, token?: vscode.CancellationToken): Promise<void> {
    return new OrganizationSelectionProvider().doSelection(client, callback, token);
  }

  public async doSelection(client:tfc.TfcClient, callback: OrganizationSelectionCallback, token?: vscode.CancellationToken): Promise<void> {
    const picker = vscode.window.createQuickPick<OrganizationPickItem>();
    let result: OrganizationPickItem | undefined = undefined;

    new Promise<readonly OrganizationPickItem[]>(async () => {
      picker.items = await this.getQuickPickItems(client, token);
      picker.busy = false;
      picker.placeholder = undefined;
      picker.enabled = true;
    });

    picker.canSelectMany = false;
    picker.title = "Select an Organization";
    picker.placeholder = "Loading organizations...";
    picker.onDidHide(() => {
      callback(result);
      picker.dispose();
    });
    picker.onDidAccept(() => {
      if (picker.activeItems.length !== 1) { picker.hide(); return; }
      result = picker.activeItems[0];
      picker.hide();
    });
    //picker.buttons = ... add refresh button
    picker.busy = true;
    picker.show();
  }

  private async getQuickPickItems(
    client: tfc.TfcClient,
    token?: vscode.CancellationToken
  ): Promise<readonly OrganizationPickItem[]> {
    return this.getTfcOrganizations(client, token)
      .then((orgs) => {
        return orgs.map<OrganizationPickItem>((org) => { return new OrganizationPickItem(org); });
      });
  }

  private async getTfcOrganizations(
    client: tfc.TfcClient,
    token?: vscode.CancellationToken, // TODO
  ): Promise<tfc.Organization[]> {
    try {
      return await tfchelper.getOrganizations(client);
    } catch (e: any) {
      if (e instanceof tfc.ApiError) {
        // HTTP 401 Unauthorized
        if (e.status === 401) {
          vscode.window.showErrorMessage(
            "Failed to get a list of Organizations. You need to use an Access Token that has access to all organizations. Please sign out and try again."
          );
        }
      }
      throw e;
    }
  }
}

// Workspace
export class WorkspacePickItem implements vscode.QuickPickItem {
  label: string;
  workspaceId: string;
  workspaceName: string;

  constructor(ws: tfc.Workspace) {
    this.label = ws.attributes.name;
    this.workspaceId = ws.id;
    this.workspaceName = ws.attributes.name;
  }
}

export type WorkspaceSelectionCallback = (result: WorkspacePickItem | undefined) => void;

export class WorkspaceSelectionProvider {
  static async select(organizationId: string, client: tfc.TfcClient, callback: WorkspaceSelectionCallback, token?: vscode.CancellationToken): Promise<void> {
    return new WorkspaceSelectionProvider().doSelection(organizationId, client, callback, token);
  }

  public async doSelection(organizationId: string, client:tfc.TfcClient, callback: WorkspaceSelectionCallback, token?: vscode.CancellationToken): Promise<void> {
    const picker = vscode.window.createQuickPick<WorkspacePickItem>();
    let result: WorkspacePickItem | undefined = undefined;

    new Promise<readonly WorkspacePickItem[]>(async () => {
      picker.items = await this.getQuickPickItems(organizationId, client, token);
      picker.busy = false;
      picker.placeholder = undefined;
      picker.enabled = true;
    });

    picker.canSelectMany = false;
    picker.title = "Select a Workspace";
    picker.placeholder = "Loading workspaces...";
    picker.onDidHide(() => {
      callback(result);
      picker.dispose();
    });
    picker.onDidAccept(() => {
      if (picker.activeItems.length !== 1) { picker.hide(); return; }
      result = picker.activeItems[0];
      picker.hide();
    });
    //picker.buttons = ... add refresh button
    picker.busy = true;
    picker.show();
  }

  private async getQuickPickItems(
    organizationId: string,
    client: tfc.TfcClient,
    token?: vscode.CancellationToken
  ): Promise<readonly WorkspacePickItem[]> {
    return this.getTfcWorkspaces(organizationId, client, token)
      .then((workspaces) => {
        return workspaces.map<WorkspacePickItem>((ws) => { return new WorkspacePickItem(ws); });
      });
  }

  private async getTfcWorkspaces(
    organizationId: string,
    client: tfc.TfcClient,
    token?: vscode.CancellationToken,
  ): Promise<tfc.Workspace[]> {
    try {
      return await tfchelper.getOrganizationIdWorkspaces(client, organizationId);
    } catch (e: any) {
      if (e instanceof tfc.ApiError) {
        // HTTP 401 Unauthorized
        if (e.status === 401) {
          vscode.window.showErrorMessage(
            "Failed to get a list of Workspaces. You need to use an Access Token that has access to all workspaces. Please sign out and try again."
          );
        }
      }
      throw e;
    }
  }
}




