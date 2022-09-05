import * as vscode from "vscode";
import * as tfc from "../../tfcApi";
import { ITfcRunProvider } from "./tfcRunProvider";
import * as tfchelper from "../../tfcHelpers";
import {
  prettyString,
  prettyDuration,
  createTextItem,
  ProviderTreeItem,
} from "./helpers";
import {
  IConfiguration,
  WorkspaceDefinitions,
  WorkspaceDefinition,
} from "../../configuration";
import { ITfcSession } from "../../tfcSession";
import * as picker from "../tfcObjectSelectionProviders";

export interface ITfcWorkspaceProvider {
  initProvider(
    initial?: WorkspaceDefinitions,
    defaultWorkspace?: WorkspaceDefinition
  ): Promise<void>;
  addWorkspaceToView(ws: WorkspaceDefinition): void;
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
  // private organizationId?: string;
  // private organization?: tfc.Organization;
  private defaultWorkspace?: WorkspaceDefinition;
  private workspaces: WorkspaceDefinitions = new WorkspaceDefinitions();
  private config: IConfiguration;
  private runProvider: ITfcRunProvider;

  constructor(
    config: IConfiguration,
    session: ITfcSession,
    runProvider: ITfcRunProvider
  ) {
    this.config = config;
    this.runProvider = runProvider;

    // session.onChangeOrganization((org) => {
    //   if (org === undefined) {
    //     this.organizationId = undefined;
    //   } else {
    //     this.organizationId = org.id;
    //   }
    //   this.refresh();
    // });
  }

  refresh(item?: ProviderTreeItem): void {
    this._onDidChangeTreeData.fire(item);
  }

  async initProvider(
    initialWorkspaces?: WorkspaceDefinitions,
    defaultWorkspace?: WorkspaceDefinition
  ): Promise<void> {
    this.defaultWorkspace = defaultWorkspace;

    if (initialWorkspaces === undefined) {
      return;
    }
    this.workspaces = initialWorkspaces.clone();
    this.refresh();
  }

  showRuns(workspaceId: string): void {
    this.runProvider.setWorkspaceId(workspaceId);
  }

  getTreeItem(element: ProviderTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ProviderTreeItem): Promise<ProviderTreeItem[]> {
    switch (element?.dependencyType) {
      case undefined:
        return this.getOrganizations();
      case "organization":
        return this.getOrganizationWorkspaces(element.data.id);
      case "workspace":
        const ws = element.data as tfc.Workspace;
        return Promise.resolve(this.getTfcWorkspaceInformation(ws));
      default:
        return Promise.resolve([]);
    }
  }

  async getOrganizations(): Promise<ProviderTreeItem[]> {
    const client = await tfchelper.createClient(this.config);
    const list: ProviderTreeItem[] = [];
    const names = this.workspaces.organizationNames();

    for (let index = 0; index < names.length; index++) {
      const org = await this.getTfcOrganization(names[index], client);
      if (org === undefined) {
        list.push(this.createUnknownOrganizationItem(names[index]));
      } else {
        const isDefaultOrg = this.defaultWorkspace !== undefined && this.defaultWorkspace.valid() && this.defaultWorkspace.organizationName === org.attributes.name;
        list.push(this.createOrganizationItem(org, isDefaultOrg));
      }
    }

    return list;
  }

  async getOrganizationWorkspaces(organizationId: string): Promise<ProviderTreeItem[]> {
    const client = await tfchelper.createClient(this.config);
    const list: ProviderTreeItem[] = [];
    const names = this.workspaces.workspaceNames(organizationId);

    for (let index = 0; index < names.length; index++) {
      const ws = await this.getTfcWorkspacebyName(organizationId, names[index], client);
      if (ws === undefined) {
        list.push(this.createUnknownWorkspaceNameItem(names[index]));
      } else {
        const isDefaultWs = this.defaultWorkspace !== undefined && this.defaultWorkspace.valid() && this.defaultWorkspace.organizationName === organizationId && this.defaultWorkspace.workspaceName === ws.attributes.name;
        list.push(this.createWorkspaceItem(ws, isDefaultWs));
      }
    }

    return list;
  }

  private async getTfcOrganization(organizationId: string, client: tfc.TfcClient): Promise<tfc.Organization | undefined> {
    try {
      return await tfchelper.getOrganization(
        client,
        organizationId,
        true
      );
    } catch (e: any) {
      if (e instanceof tfc.ApiError) {
        // HTTP 401 Unauthorized
        if (e.status === 401) {
          vscode.window.showErrorMessage(
            "Failed to get the selected Organization. You need to use an Access Token that has access to all organizations. Please sign out and try again."
          );
        }
        // HTTP 404 Not Found
        if (e.status === 404) {
          return undefined;
        }
      }
      throw e;
    }
  }

  private async getTfcWorkspacebyName(organizationId: string, workspaceName: string, client: tfc.TfcClient): Promise<tfc.Workspace | undefined> {
    try {
      return await tfchelper.getWorkspaceByName(
        client,
        organizationId,
        workspaceName,
        true
      );
    } catch (e: any) {
      if (e instanceof tfc.ApiError) {
        // HTTP 401 Unauthorized
        if (e.status === 401) {
          vscode.window.showErrorMessage(
            "Failed to get the selected Workspace. You need to use an Access Token that has access to all workspaces. Please sign out and try again."
          );
        }
        // HTTP 404 Not Found
        if (e.status === 404) {
          return undefined;
        }
      }
      throw e;
    }
  }


  // async getTfcOrganizations(): Promise<ProviderTreeItem[]> {
  //   const client = await tfchelper.createClient(this.config);
  //   try {
  //     return client.organizations.listOrganizations().then(
  //       (response) => {
  //         return response.data.map((org) => {
  //           return this.createOrganizationItem(org);
  //         });
  //       }
  //     );
  //   } catch (e: any) {
  //     if (e.message === "Unauthorized") {
  //       vscode.window.showErrorMessage(
  //         "Failed to get a list of Organizations. You need to use an Access Token that has access to all organizations. Please sign out and try again."
  //       );
  //     }
  //     throw e;
  //   }
  // }

  // async getTfcWorkspaces(org: tfc.Organization): Promise<ProviderTreeItem[]> {
  //   const client = await tfchelper.createClient(this.config);
  //   try {
  //     return tfchelper
  //       .getOrganizationWorkspaces(client, org)
  //       .then((workspaces) => {
  //         return workspaces.map((workspace) => {
  //           return this.createWorkspaceItem(workspace);
  //         });
  //       });
  //   } catch (e: any) {
  //     if (e.message === "Unauthorized") {
  //       vscode.window.showErrorMessage(
  //         "Failed to get Workspaces in an Organization. You need to use an Access Token that has access to all organizations. Please sign out and try again."
  //       );
  //     }
  //     throw e;
  //   }
  // }

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
    );
    if (ws.attributes["workspace-kpis-runs-count"] !== null) {
      list.push(
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
        ),
      );
    };

    return list;
  }

  createOrganizationItem(org: tfc.Organization, isDefaultOrg: boolean): ProviderTreeItem {
    let item = new ProviderTreeItem(
      org.attributes.name,
      isDefaultOrg ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
      "organization",
      org
    );
    item.iconPath = new vscode.ThemeIcon("organization");
    item.contextValue = "organization";
    return item;
  }

  createUnknownOrganizationItem(organizationId: string): ProviderTreeItem {
    let item = new ProviderTreeItem(
      organizationId,
      vscode.TreeItemCollapsibleState.None,
      "unknownOrganization",
      undefined
    );
    item.iconPath = new vscode.ThemeIcon("question");
    item.tooltip = `Could not find an organization called '${organizationId}'`;
    item.contextValue = "unknownOrganization";
    return item;
  }

  createWorkspaceItem(workspace: tfc.Workspace, isDefaultWorkspace: boolean): ProviderTreeItem {
    let item = new ProviderTreeItem(
      workspace.attributes.name,
      isDefaultWorkspace ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
      "workspace",
      workspace,
      {
        command: "terraform-cloud.workspacesTreeData.showRuns",
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

  createUnknownWorkspaceNameItem(workspaceName: string): ProviderTreeItem {
    let item = new ProviderTreeItem(
      workspaceName,
      vscode.TreeItemCollapsibleState.None,
      "unknownWorkspace",
      undefined
    );
    item.iconPath = new vscode.ThemeIcon("question");
    item.tooltip = `Could not find an workspace called '${workspaceName}'`;
    item.contextValue = "unknownWorkspace";
    return item;
  }

  public addWorkspaceToView(ws: WorkspaceDefinition): void {
    if (this.workspaces.add(ws)) {
      this.refresh();
    }
  }
}

function doWatchEntry(item: ProviderTreeItem, session: ITfcSession): void {
  session.watchWorkspaceId(item.data.id);
}

async function doOpenInTfc(
  config: IConfiguration,
  item: ProviderTreeItem
): Promise<void> {
  let uri: string | undefined;

  switch (item.contextValue) {
    case "organization":
      uri = await tfchelper.urlForOrganization(item.data, config.apiUrl);
      break;
    case "workspace":
      uri = await tfchelper.urlForWorkspace(item.data, config.apiUrl);
      break;
  }
  if (uri === undefined) {
    return;
  }

  vscode.env.openExternal(vscode.Uri.parse(uri));
}

async function doAddOrganizationWorkspace(
  organizationId: string,
  config: IConfiguration,
  workspacesProvider: TfcWorkspaceProvider
): Promise<void> {

  const client = await tfchelper.createClient(config);
  return picker.WorkspaceSelectionProvider.select(organizationId, client, (picked: picker.WorkspacePickItem | undefined): void => {
    if (picked) {
      workspacesProvider.addWorkspaceToView(new WorkspaceDefinition(`${organizationId}/${picked.workspaceName}`));
    }
  });
}

async function doAddOrganization(
  config: IConfiguration,
  workspacesProvider: TfcWorkspaceProvider
): Promise<void> {

  const client = await tfchelper.createClient(config);
  return picker.OrganizationSelectionProvider.select(client, (picked: picker.OrganizationPickItem | undefined): void => {
    if (picked) {
      doAddOrganizationWorkspace(picked.orgId, config, workspacesProvider);
    }
  });
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
      "terraform-cloud.workspacesTreeData.refreshEntry",
      (e: ProviderTreeItem) => workspacesProvider.refresh(e)
    ),
    vscode.commands.registerCommand(
      "terraform-cloud.workspacesTreeData.showRuns",
      (workspaceId) => workspacesProvider.showRuns(workspaceId)
    ),
    vscode.commands.registerCommand(
      "terraform-cloud.workspacesTreeData.watchEntry",
      async (e: ProviderTreeItem) => {
        doWatchEntry(e, session);
      }
    ),
    vscode.commands.registerCommand(
      "terraform-cloud.workspacesTreeData.openInTfc",
      async (item: ProviderTreeItem) => {
        doOpenInTfc(config, item);
      }
    ),
    vscode.commands.registerCommand(
      "terraform-cloud.workspacesTreeData.addOrgWorkspace",
      async () => {
        doAddOrganization(config, workspacesProvider);
      }
    ),
  ];
}
