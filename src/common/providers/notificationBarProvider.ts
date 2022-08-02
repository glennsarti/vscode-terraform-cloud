import * as vscode from 'vscode';
import { IConfiguration } from '../configuration';
import * as tfc from '../tfcApi';
import * as tfchelpers from '../tfcHelpers';
import { ITfcSession } from "../tfcSession";
import { WORKSPACE_AND_RUN_PICKER_COMMAND } from "./tfcApiCommandsProvider";

export const NOTIFICATION_STATUSBAR_ID = "tfc_notification_bar";

const DELAY_BACK_OFF = 1.2;
const DELAY_MAXIMUM = 10000.0;
const DELAY_MINIMUM = 2000.0;

export interface INotificationBarProvider {
  startWatch(organizationId: string, workspaceId: string, workspaceNameHint?: string): void
}

export class NotificationBarProvider implements INotificationBarProvider, vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private orgId: string = "";
  private workspaceId: string = "";
  private workspaceName: string = "";
  private workspace?: tfc.Workspace;
  private runs: Map<string, tfc.Run> = new Map<string, tfc.Run>();
  private isWatching: boolean = false;
  private timer?: ReturnType<typeof setTimeout>;
  private timeDelayMs: number = 0.0;
  private config: IConfiguration;

  public startWatch(organizationId: string, workspaceId: string, workspaceNameHint?: string): void {
    if (organizationId !== this.orgId || workspaceId !== this.workspaceId) {
      this.orgId = organizationId;
      this.workspaceId = workspaceId;
      this.workspaceName = workspaceNameHint === undefined ? "" : workspaceNameHint;
      this.isWatching = true;

      this.initWatch();
    }
  }

  public refresh(): void {
    if (!this.isWatching) { return; }

    this.statusBarItem.text = ("$(loading~spin) " + this.workspaceName).trim();
    this.statusBarItem.tooltip = "Refreshing Terraform Cloud Workspace...";

    if (this.timer !== undefined) { clearTimeout(this.timer); }
    this.timer = setTimeout(() => { this.doTimerEvent(); }, 0);
  }

  public stopWatch(): void {
    this.isWatching = false;
    this.workspace = undefined;
    if (this.timer !== undefined) { clearTimeout(this.timer); }
    this.statusBarItem.hide();
  }

  private async doTimerEvent(): Promise<void> {
    this.timer = undefined;
    await this.getWorkspaceInfo();
    await this.renderWorkspace();
    if (this.timeDelayMs < DELAY_MINIMUM) { this.timeDelayMs = DELAY_MINIMUM; }
    if (this.timeDelayMs > DELAY_MAXIMUM) { this.timeDelayMs = DELAY_MAXIMUM; }
    this.timer = setTimeout(() => { this.doTimerEvent(); }, this.timeDelayMs);
  }

  private async initWatch(): Promise<void> {
    this.workspace = undefined;
    this.statusBarItem.text = ("$(loading~spin) " + this.workspaceName).trim();
    this.statusBarItem.tooltip = "Loading Terraform Cloud Workspace...";
    this.statusBarItem.show();

    if (this.timer !== undefined) { clearTimeout(this.timer); }
    this.timeDelayMs = DELAY_MINIMUM;
    this.timer = setTimeout(() => { this.doTimerEvent(); }, 0);
  };

  private async getWorkspaceInfo(): Promise<void> {
    const client = await tfchelpers.createClient(this.config);
    this.workspace = await tfchelpers.getWorkspace(client, this.workspaceId, false);
    this.runs.clear();
    if (this.workspace === undefined) { return; }
    this.workspaceName = this.workspace.attributes.name;
    if (this.workspace.relationships === undefined) { return; }

    let run: tfc.Run | undefined;
    if (this.workspace.relationships?.["current-run"]?.data?.id !== undefined) {
      run = (await tfchelpers.getRun(client, this.workspace.relationships["current-run"]?.data.id))?.data;
      if (run !== undefined) { this.runs.set("currentRun", run); }
    }

    if (this.workspace.relationships?.["latest-run"]?.data?.id !== undefined) {
      run = (await tfchelpers.getRun(client, this.workspace.relationships["latest-run"].data.id))?.data;
      if (run !== undefined) { this.runs.set("latestRun", run); }
    }
  }

  private async renderWorkspace(): Promise<void> {
    if (this.workspace === undefined) {
      this.renderUnknownWorkspace();
      return;
    }
    let itemIcon = "$(loading~spin)";
    let itemText = this.workspaceName;
    let itemTooltip = "**" + this.workspace.attributes.name + "**";

    if (this.workspace.attributes.description && this.workspace.attributes.description !== "") {
      itemTooltip = itemTooltip + "\n\n" + this.workspace.attributes.description;
    }

    let run = this.runs.get('currentRun');
    let currentlyRunning = false;
    if (run !== undefined && !tfchelpers.runStatusIsCompleted(run)) {
      currentlyRunning = true;
      itemIcon = "$(" + tfchelpers.runStatusIcon(run as tfc.Run) + ")";
      itemTooltip = itemTooltip + "\n\n[Current Run](" + await this.consoleUrlForRun(this.config, run as tfc.Run) + ") : " + tfchelpers.prettyStatus(run.attributes.status);
    } else {
      run = this.runs.get('latestRun');
      if (run !== undefined) {
        itemIcon = "$(" + tfchelpers.runStatusIcon(run) + ")";
        itemTooltip = itemTooltip + "\n\n[Latest Run](" + await this.consoleUrlForRun(this.config, run) + ") : " + tfchelpers.prettyStatus(run.attributes.status);
      } else {
        itemIcon = "$(stop-circle)";
      }
    }

    if (this.workspace.attributes.locked && !currentlyRunning) { itemIcon = "$(lock)"; }
    const newText = itemIcon + " " + itemText;

    if (this.statusBarItem.text !== newText) {
      this.timeDelayMs = DELAY_MINIMUM;
    } else {
      this.timeDelayMs = this.timeDelayMs * DELAY_BACK_OFF;
    }

    this.statusBarItem.text = newText;
    itemTooltip += "\n\nClick to start a run.";
    this.statusBarItem.tooltip = new vscode.MarkdownString(itemTooltip);

    if (this.workspace.attributes.locked) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    } else {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.background");
    }

    // if (this.statusBarItem.command === undefined) {
    //   let cmd = {
    //     arguments: [this.workspace.id, this.workspace.attributes.name, "Created from VSCode Terraform Cloud Extension"],
    //     command: "terraform-cloud.create-a-run",
    //     title: "Create a new run",
    //   };
    //   this.statusBarItem.command = cmd;
    // }

    let cmd = {
      arguments: [this.workspace, currentlyRunning ? this.runs.get('currentRun') : undefined],
      command: WORKSPACE_AND_RUN_PICKER_COMMAND,
      title: "Notification Bar Command",
    };
    this.statusBarItem.command = cmd;
  }

  private renderUnknownWorkspace(): void {
    this.statusBarItem.text = "$(warning)";
    this.statusBarItem.tooltip = "Could not find the workspace within Terraform Cloud";
    this.statusBarItem.command = undefined;
  }

  private async consoleUrlForRun(config: IConfiguration, run: tfc.Run): Promise<string | undefined> {
    return tfchelpers.urlForRun(run, config.apiUrl);
  }

  public dispose() {
    if (this.timer !== undefined) { clearTimeout(this.timer); }
    this.statusBarItem.hide();
    this.statusBarItem.dispose();
  }

  constructor(config: IConfiguration, session: ITfcSession) {
    this.config = config;
    this.statusBarItem = vscode.window.createStatusBarItem(NOTIFICATION_STATUSBAR_ID, vscode.StatusBarAlignment.Left);
    this.statusBarItem.hide();

    session.onWatchingWorkspace((workspace) => {
      if (workspace === undefined ||  workspace.relationships?.organization?.data?.id === undefined) {
        this.stopWatch();
      } else {
        this.startWatch(
          workspace.relationships.organization.data.id,
          workspace.id,
          workspace.attributes.name
        );
      }
      this.refresh();
    });

    session.onChangeInWorkspace((workspace) => {
      if (workspace !== undefined && workspace.id === this.workspaceId) {
        this.refresh();
      }
    });
  }
}

export function registerTerrafromCloudNotificationBarProvider(
  provider: NotificationBarProvider
): vscode.Disposable[] {
  return [
    provider
  ];
}
