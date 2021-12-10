import * as vscode from "vscode";
// import { TerraformCloud } from "../tfc/api";
// import * as tfc from "../tfc/types";
import * as tfc from '../tfcApi';
//import { ITfcWorkspaceProvider } from "./treeData/tfcWorkspaceProvider";
import * as tfchelper from "../tfcHelpers";
import { IConfiguration } from "../configuration";
import { ITfcSession } from "../tfcSession";

export interface ITfcOrgSelectionProvider {
  doSelection(session: ITfcSession, config:IConfiguration, token?: vscode.CancellationToken): Promise<void>;
}

class OrgPickItem implements vscode.QuickPickItem {
  label: string;
  orgId: string;

  constructor(org: tfc.Organization) {
    this.label = org.id;
    this.orgId = org.id;
  }
}

export class TfcOrgSelectionProvider implements ITfcOrgSelectionProvider {
  public async doSelection(session: ITfcSession, config:IConfiguration, token?: vscode.CancellationToken): Promise<void> {
    const picker = vscode.window.createQuickPick<OrgPickItem>();

    new Promise<readonly OrgPickItem[]>(async () => {
      const client = await tfchelper.createClient(config);
      picker.items = await this.getQuickPickItems(client, token);
      picker.busy = false;
      picker.placeholder = undefined;
      picker.enabled = true;
    });

    picker.canSelectMany = false;
    picker.title = "Select an Organization";
    picker.placeholder = "Loading organizations...";
    picker.onDidHide(() => {
      picker.dispose();
    });
    picker.onDidAccept(() => {
      if (picker.activeItems.length !== 1) { picker.hide(); return; }
      picker.hide();
      session.organizationId = picker.activeItems[0].orgId
    });
    //picker.buttons = ... add refresh button
    picker.busy = true;
    picker.show();
  }

  private async getQuickPickItems(
    client: tfc.TfcClient,
    token?: vscode.CancellationToken
  ): Promise<readonly OrgPickItem[]> {
    return this.getTfcOrganizations(client, token)
      .then((orgs) => {
        return orgs.map<OrgPickItem>((org) => { return new OrgPickItem(org); });
      });
  }

  private async getTfcOrganizations(
    client: tfc.TfcClient,
    token?: vscode.CancellationToken,
  ): Promise<tfc.Organization[]> {
    try {
      return tfchelper.getOrganizations(client);
    } catch (e: any) {
      if (e.message === "Unauthorized") {
        vscode.window.showErrorMessage(
          "Failed to get a list of Organizations. You need to use an Access Token that has access to all organizations. Please sign out and try again."
        );
      }
      throw e;
    }
  }
}

export function registerTerrafromCloudOrgSelectionProvider(
  _context: vscode.ExtensionContext,
  config:IConfiguration,
  selectionProvider: TfcOrgSelectionProvider,
  session: ITfcSession,
) {
  return [
    vscode.commands.registerCommand("terraform-cloud.selectOrganization", async () => {
      selectionProvider.doSelection(session, config);
    }),
  ];
}
