import * as vscode from 'vscode';
import { prettyString, createTextItem, ProviderTreeItem } from "./helpers";
import { IConfiguration } from "../../configuration";
import * as tfc from '../../tfcApi';
import * as tfchelper from '../../tfcHelpers';

export interface ITfcRunProvider {
  initProvider(workspaceId?: string): void;
  setWorkspaceId(workspaceId: string): void;
  refresh(item?: ProviderTreeItem): void;
}

export class TfcRunProvider implements ITfcRunProvider,vscode.TreeDataProvider<ProviderTreeItem> {

  private _onDidChangeTreeData: vscode.EventEmitter<ProviderTreeItem | undefined | void> = new vscode.EventEmitter<ProviderTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ProviderTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  private workspaceId: string;
  private config:IConfiguration;

  constructor(config: IConfiguration) {
    this.config = config;
    this.workspaceId = '';
  }

  initProvider(workspaceId?: string): void {
    this.workspaceId = workspaceId || "";
    this._onDidChangeTreeData.fire();
  }

  refresh(item?: ProviderTreeItem): void {
    this._onDidChangeTreeData.fire(item);
  }

  setWorkspaceId(workspaceId: string): void {
    this.workspaceId = workspaceId;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProviderTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ProviderTreeItem): Thenable<ProviderTreeItem[]> {
    if (this.workspaceId === '') { return Promise.resolve([]); };
    if (!element) { return Promise.resolve(this.getTfcLastRuns()); };

    switch (element.dependencyType) {
      case 'run':
        const run = element.data as tfc.Run;
        return Promise.resolve(this.getTfcRunInformation(run));
      default:
        return Promise.resolve([]);
    }
  }

  async getTfcLastRuns(): Promise<ProviderTreeItem[]> {
    const client = await tfchelper.createClient(this.config);

    try {
      // TODO: How to paginate?
      const runs = await tfchelper.getRuns(client, this.workspaceId);
      if (runs === undefined) { return []; }
      if (runs.length === 0) { return [createTextItem("The workspace has no runs", "")]; }
      return runs.map(run => {
        return this.createRunItem(run);
      });
    } catch (e: any) {
      if (e.message === 'Unauthorized') {
        vscode.window.showErrorMessage('Failed to get a list of Runs. You need to use an Access Token that has access to all organizations. Please sign out and try again.');
      }
      throw e;
    }
  };

  async getTfcRunInformation(run: tfc.Run): Promise<ProviderTreeItem[]> {
    const list: ProviderTreeItem[] = [];
    let client: tfc.TfcClient | undefined;

    list.push(
      createTextItem(
        `Status: ${tfchelper.prettyStatus(run.attributes.status)}`,
        ""
      ),
      createTextItem(
        `Created at: ${tfchelper.valueToPrettyDate(run.attributes["created-at"])}`,
        ""
      )
    );

    if (run.relationships?.apply?.data?.id) {
      if (client === undefined) { client = await tfchelper.createClient(this.config); }
      const apply = await tfchelper.getApply(client, run.relationships.apply.data.id);
      if (apply !== undefined && apply.attributes.status === "finished") {
        list.push(
          createTextItem(
            `Applied at: ${tfchelper.valueToPrettyDate(apply.attributes["status-timestamps"]?.['finished-at'])}`,
            ""
          ),
          createTextItem(
            `Resources Applied: +${prettyString(apply.attributes["resource-additions"])},` +
            `~${prettyString(apply.attributes["resource-changes"])},` +
            `-${prettyString(apply.attributes["resource-destructions"])}`,
            ""
          )
        );
      }
    }

    return list;
  };

  createRunItem(run: tfc.Run) : ProviderTreeItem
  {
    let label = "";
    if (run.attributes.message) {
      label = run.attributes.message.trim();
    }
    if (label.length > 0) {
      label += " - " + tfchelper.valueToPrettyDate(run.attributes["created-at"]);
    } else {
      label = tfchelper.valueToPrettyDate(run.attributes["created-at"]);
    }

    let item = new ProviderTreeItem(
      label,
      vscode.TreeItemCollapsibleState.Collapsed,
      "run",
      run
    );
    item.iconPath = new vscode.ThemeIcon(tfchelper.runStatusIcon(run));
    item.contextValue = "run";

    return item;
  };
}

async function doOpenInTfc(config: IConfiguration, item: ProviderTreeItem): Promise<void> {
  let uri: string | undefined;

  switch (item.contextValue) {
    case "run":
      uri = await tfchelper.urlForRun(item.data, config.apiUrl);
      break;
  }
  if (uri === undefined) { return; }

  vscode.env.openExternal(vscode.Uri.parse(uri));
}

export function registerTerrafromCloudRunsTreeDataProvider(
  _context: vscode.ExtensionContext,
  config: IConfiguration,
  runProvider: TfcRunProvider
): vscode.Disposable[] {
  return [
    vscode.window.registerTreeDataProvider('tfcWorkspaceRuns', runProvider),
    vscode.commands.registerCommand("terraform-cloud.runsTreeData.openInTfc",
      async (item: ProviderTreeItem) => { doOpenInTfc(config, item); }
    ),
    vscode.commands.registerCommand("terraform-cloud.runsTreeData.viewDetails",
      async (item: ProviderTreeItem) => { item.showMarkdownPreview(config); }
    ),
    vscode.commands.registerCommand("terraform-cloud.runsTreeData.refreshEntry",
      (item: ProviderTreeItem) => { runProvider.refresh(item); }
    ),
  ];
}
