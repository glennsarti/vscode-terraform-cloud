import * as vscode from "vscode";
import * as tfc from '../../tfcApi';
import { ITfcRunProvider } from "./tfcRunProvider";
import * as tfchelper from "../../tfcHelpers";
import { prettyString, prettyDuration, createTextItem, ProviderTreeItem } from "./helpers";
import { IConfiguration } from "../../configuration";
import { ITfcSession } from "../../tfcSession";

export interface ITfcWorkspaceProvider {
  initProvider(organizationId: string, workspaceId?: string): Promise<void>;
}

export class TfcWorkspaceProvider
  implements ITfcWorkspaceProvider, vscode.TreeDataProvider<ProviderTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ProviderTreeItem | undefined | void
  > = new vscode.EventEmitter<ProviderTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ProviderTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;
  private organizationId?: string;
  private organization?: tfc.Organization;
  private defaultWorkspaceId?: string;
  private config: IConfiguration;
  private runProvider: ITfcRunProvider;

  constructor(config: IConfiguration, session: ITfcSession, runProvider: ITfcRunProvider) {
    this.config = config;
    this.runProvider = runProvider;

    session.onChangeOrganization((org) => {
      if (org === undefined) {
        this.organizationId = undefined;
      } else {
        this.organizationId = org.id;
      }
      this.refresh();
    });
  }

  refresh(item?: ProviderTreeItem): void {
    this._onDidChangeTreeData.fire(item);
  }

  async initProvider(
    organizationId?: string,
    workspaceId?: string
  ): Promise<void> {
    this.organizationId = organizationId;
    this.defaultWorkspaceId = workspaceId;
    this.refresh();
  }

  showRuns(workspaceId: string): void {
    this.runProvider.refresh(workspaceId);
  }

  getTreeItem(element: ProviderTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ProviderTreeItem): Promise<ProviderTreeItem[]> {
    if (this.organizationId === "") {
      Promise.resolve([]);
    }

    switch (element?.dependencyType) {
      case undefined:
        await this.getTfcOrganization();
        if (this.organization === undefined) {
          return Promise.resolve([]);
        }
        return Promise.resolve(this.getTfcWorkspaces(this.organization));
      case "workspace":
        const ws = element.data as tfc.Workspace;
        return Promise.resolve(this.getTfcWorkspaceInformation(ws));
      default:
        return Promise.resolve([]);
    }
  }

  private async getTfcOrganization(): Promise<void> {
    if (this.organizationId === undefined) {
      this.organization = undefined;
      return;
    }
    const client = await tfchelper.createClient(this.config);
    try {
      this.organization = await tfchelper.getOrganization(
        client,
        this.organizationId,
        true
      );
    } catch (e: any) {
      if (e.message === "Unauthorized") {
        vscode.window.showErrorMessage(
          "Failed to get the selected Organization. You need to use an Access Token that has access to all organizations. Please sign out and try again."
        );
      }
      throw e;
    }
  }

  async getTfcOrganizations(): Promise<ProviderTreeItem[]> {
    const client = await tfchelper.createClient(this.config);
    try {
      return client.organizations.listOrganizations().then(
        (response) => {
          return response.data.map((org) => {
            return this.createOrganizationItem(org);
          });
        }
      );
    } catch (e: any) {
      if (e.message === "Unauthorized") {
        vscode.window.showErrorMessage(
          "Failed to get a list of Organizations. You need to use an Access Token that has access to all organizations. Please sign out and try again."
        );
      }
      throw e;
    }
  }

  async getTfcWorkspaces(org: tfc.Organization): Promise<ProviderTreeItem[]> {
    const client = await tfchelper.createClient(this.config);
    try {
      return tfchelper
        .getOrganizationWorkspaces(client, org)
        .then((workspaces) => {
          return workspaces.map((workspace) => {
            return this.createWorkspaceItem(workspace);
          });
        });
    } catch (e: any) {
      if (e.message === "Unauthorized") {
        vscode.window.showErrorMessage(
          "Failed to get Workspaces in an Organization. You need to use an Access Token that has access to all organizations. Please sign out and try again."
        );
      }
      throw e;
    }
  }

  getTfcWorkspaceInformation(ws: tfc.Workspace): ProviderTreeItem[] {
    const list: ProviderTreeItem[] = [];

    list.push(
      createTextItem(
        `Execution mode: ${prettyString(ws.attributes["execution-mode"])}`,
        ""
      ),
      createTextItem(
        `Auto apply: ${prettyString(ws.attributes["auto-apply"])}`,
        ""
      ),
      createTextItem(
        `Average plan time: ${prettyDuration(
          ws.attributes["apply-duration-average"]
        )}`,
        ""
      ),
      createTextItem(
        `Average apply time: ${prettyDuration(
          ws.attributes["apply-duration-average"]
        )}`,
        ""
      ),
      createTextItem(
        `Failed runs: ${ws.attributes["run-failures"]} of ${ws.attributes["workspace-kpis-runs-count"]}`,
        ""
      )
    );

    return list;
  }

  createOrganizationItem(org: tfc.Organization): ProviderTreeItem {
    let item = new ProviderTreeItem(
      org.attributes.name,
      vscode.TreeItemCollapsibleState.Collapsed,
      "organization",
      org
    );
    item.iconPath = new vscode.ThemeIcon("organization");
    item.contextValue = "organization";
    return item;
  }

  createWorkspaceItem(workspace: tfc.Workspace): ProviderTreeItem {
    let state = vscode.TreeItemCollapsibleState.Collapsed;
    if (workspace.id === this.defaultWorkspaceId) {
      state = vscode.TreeItemCollapsibleState.Expanded;
    }
    let item = new ProviderTreeItem(
      workspace.attributes.name,
      state,
      "workspace",
      workspace,
      {
        command: "terraform-cloud.workspaces.showRuns",
        title: "",
        arguments: [workspace.id],
      }
    );
    item.iconPath = new vscode.ThemeIcon("circuit-board");
    if (workspace.attributes.description) {
      item.tooltip = workspace.attributes.description;
    }
    item.contextValue = "workspace";
    return item;
  }
}

function doWatchEntry(
  item: ProviderTreeItem,
  session: ITfcSession,
): void {
  session.watchWorkspaceId(item.data.id);
}

async function doOpenInTfc(config: IConfiguration, item: ProviderTreeItem): Promise<void> {
  let uri: string | undefined;

  switch (item.contextValue) {
    case "organization":
      uri = await tfchelper.urlForOrganization(
        item.data,
        config.apiUrl
      );
      break;
    case "workspace":
      uri = await tfchelper.urlForWorkspace(
        item.data,
        config.apiUrl
      );
      break;
  }
  if (uri === undefined) {
    return;
  }

  vscode.env.openExternal(vscode.Uri.parse(uri));
}

export function registerTerrafromCloudWorkspacesTreeDataProvider(
  _context: vscode.ExtensionContext,
  config: IConfiguration,
  session: ITfcSession,
  workspacesProvider: TfcWorkspaceProvider
): vscode.Disposable[] {
  return [
    vscode.window.registerTreeDataProvider("tfcWorkspaces", workspacesProvider),
    vscode.commands.registerCommand(
      "terraform-cloud.workspaces.refreshEntry",
      (e: ProviderTreeItem) => workspacesProvider.refresh(e)
    ),
    vscode.commands.registerCommand(
      "terraform-cloud.workspaces.showRuns",
      (workspaceId) => workspacesProvider.showRuns(workspaceId)
    ),
    vscode.commands.registerCommand(
      "terraform-cloud.workspaces.watchEntry",
      async (e: ProviderTreeItem) => {
        doWatchEntry(e, session);
      }
    ),
    vscode.commands.registerCommand(
      "terraform-cloud.workspaces.openInTfc",
      async (item: ProviderTreeItem) => {
        doOpenInTfc(config, item);
      }
    ),
  ];
}
