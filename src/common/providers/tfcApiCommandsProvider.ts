import * as vscode from "vscode";
import * as tfc from "../tfcApi";
import * as tfchelper from "../tfcHelpers";
import { IConfiguration } from "../configuration";
import { TfcCreateRunDefinition } from "./taskTerminals/createRunTerminal";
import { ITerraformCloudTaskProvider } from "./taskProvider";

export const APPROVE_RUN_COMMAND = "terraform-cloud.approve-run.command";
export const CANCEL_RUN_COMMAND = "terraform-cloud.cancel-run.command";
export const CREATE_RUN_COMMAND = "terraform-cloud.create-run.command";
export const DISCARD_RUN_COMMAND = "terraform-cloud.discard-run.command";
export const FORCE_UNLOCK_WORKSPACE_COMMAND = "terraform-cloud.force-unlock-workspace.command";
export const UNLOCK_WORKSPACE_COMMAND = "terraform-cloud.unlock-workspace.command";
export const WORKSPACE_AND_RUN_PICKER_COMMAND = "terraform-cloud.workspace-current-run.picker";

async function notificationBarCommand(
  workspace: tfc.Workspace,
  currentRun?: tfc.Run,
): Promise<void> {
  let items = [];

  if (workspace.attributes.permissions["can-queue-run"] === true) {
    items.push({ label: '$(add) Create a default run', description: `Create a new run in the '${workspace.attributes.name}' workspace with default settings.`, commandName: CREATE_RUN_COMMAND });
    items.push({ label: '$(add) Create a new run', description: `Create a new run in the '${workspace.attributes.name}' workspace with advanced settings.`, commandName: CREATE_RUN_COMMAND });
  }

  if (workspace.attributes.locked && currentRun === undefined) {
    if (workspace.attributes.permissions["can-unlock"] === true) {
      items.push({ label: '$(unlock) Unlock workspace', description: `Unlock the '${workspace.attributes.name}' workspace.`, commandName: UNLOCK_WORKSPACE_COMMAND });
    } else if (workspace.attributes.permissions["can-force-unlock"] === true) {
      items.push({ label: '$(unlock) Force unlock workspace', description: `Force unlock the '${workspace.attributes.name}' workspace.`, commandName: FORCE_UNLOCK_WORKSPACE_COMMAND });
    }
  }

  if (currentRun !== undefined) {
    if (tfchelper.runIsConfirmable(currentRun)) {
      items.push({ label: '$(pass) Approve current run', description: `Confirm the run '${currentRun.id}'.`, commandName: APPROVE_RUN_COMMAND });
    }

    if (tfchelper.runIsDiscardable(currentRun)) {
      items.push({ label: '$(trash) Discard current run', description: `Discard the run '${currentRun.id}'.`, commandName: DISCARD_RUN_COMMAND });
    }

    if (tfchelper.runIsCancelable(currentRun)) {
      items.push({ label: '$(error) Cancel current run', description: `Cancel the run '${currentRun.id}'.`, commandName: CANCEL_RUN_COMMAND });
    }
  }
  if (items.length === 0) {
    // TODO: mesage that you can't do anything
    return;
  }

  const result = await vscode.window.showQuickPick(items, { canPickMany: false, placeHolder: "Create a new run" });
  if (result === undefined) { return; }

  switch (result.commandName) {
    case CREATE_RUN_COMMAND:
      vscode.commands.executeCommand(result.commandName, workspace, result.label.includes("default"));
      break;
    case CANCEL_RUN_COMMAND:
    case DISCARD_RUN_COMMAND:
    case APPROVE_RUN_COMMAND:
      vscode.commands.executeCommand(result.commandName, currentRun);
      break;
    }
}

async function getCreateRunDefinition(workspace: tfc.Workspace, useDefault: boolean): Promise<TfcCreateRunDefinition | undefined> {
  let defn = new TfcCreateRunDefinition();
  defn.workspaceId = workspace.id;
  defn.workspaceName = workspace.attributes.name;

  const comment = await vscode.window.showInputBox({
    title: "Create a run - Enter a comment for the run",
    placeHolder: "Optional comment",
  });

  if (comment === undefined) {
    return;
  }
  defn.message = comment;

  if (useDefault) {
    return defn;
  }
}

async function createRunCommand(taskProvider: ITerraformCloudTaskProvider, workspace: tfc.Workspace, useDefault: boolean): Promise<void> {
  getCreateRunDefinition(workspace, useDefault).then((taskDefn) => {
    if (taskDefn === undefined) { return; }
    vscode.tasks.executeTask(taskProvider.createRunTask(taskDefn));
  });
}

async function approveRunCommand(config: IConfiguration, run: tfc.Run): Promise<void> {
  // TODO: Check if the run is approvable... tfchelper.runIsConfirmable(currentRun)

  const comment = await vscode.window.showInputBox({
    title: "Approve a run - Enter a comment for the approval",
    placeHolder: "Optional comment",
  });

  if (comment === undefined) {
    return;
  }

  const client = await tfchelper.createClient(config);
  await client.runs.applyRun(run.id, comment.trim() !== "" ? { comment: comment.trim() } : undefined);

  vscode.window.showInformationMessage(`Run '${run.id}' has been approved.`);
}

async function cancelRunCommand(config: IConfiguration, run: tfc.Run): Promise<void> {
  // TODO: Check if the run is cancelable... tfchelper.runIsCancelable(currentRun)

  const comment = await vscode.window.showInputBox({
    title: "Cancel a run - Enter a comment for the cancelation",
    placeHolder: "Optional comment",
  });

  if (comment === undefined) {
    return;
  }

  const client = await tfchelper.createClient(config);
  await client.runs.cancelRun(run.id, comment.trim() !== "" ? { comment: comment.trim() } : undefined);

  vscode.window.showInformationMessage(`Run '${run.id}' has been canceled.`);
}

export function registerTerrafromCloudApiCommands(
  config: IConfiguration,
  taskProvider: ITerraformCloudTaskProvider,
) {
  return [
    vscode.commands.registerCommand(WORKSPACE_AND_RUN_PICKER_COMMAND, async (workspace: tfc.Workspace, currentRun: tfc.Run) => {
      notificationBarCommand(workspace, currentRun);
    }),
    vscode.commands.registerCommand(CREATE_RUN_COMMAND, async (workspace: tfc.Workspace, useDefault: boolean) => {
      createRunCommand(taskProvider, workspace, useDefault);
    }),
    vscode.commands.registerCommand(APPROVE_RUN_COMMAND, async (run: tfc.Run) => {
      approveRunCommand(config, run);
    }),
    vscode.commands.registerCommand(CANCEL_RUN_COMMAND, async (run: tfc.Run) => {
      cancelRunCommand(config, run);
    }),
  ];
}
