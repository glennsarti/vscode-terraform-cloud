import * as vscode from "vscode";
import * as tfc from "../tfcApi";
import * as tfchelper from "../tfcHelpers";
import { IConfiguration } from "../configuration";
import { TfcCreateRunDefinition } from "./taskTerminals/createRunTerminal";
import { ITerraformCloudTaskProvider } from "./taskProvider";
import { ITfcSession } from "../tfcSession";

export const APPROVE_RUN_COMMAND = "terraform-cloud.approve-run.command";
export const CANCEL_RUN_COMMAND = "terraform-cloud.cancel-run.command";
export const CREATE_RUN_COMMAND = "terraform-cloud.create-run.command";
export const DISCARD_RUN_COMMAND = "terraform-cloud.discard-run.command";
export const FORCE_UNLOCK_WORKSPACE_COMMAND = "terraform-cloud.force-unlock-workspace.command";
export const LOCK_WORKSPACE_COMMAND = "terraform-cloud.lock-workspace.command";
export const OVERRIDE_RUN_COMMAND = "terraform-cloud.override-run.command";
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

  if (!workspace.attributes.locked && workspace.attributes.permissions["can-lock"]) {
    items.push({ label: '$(lock) Lock workspace', description: `Lock the '${workspace.attributes.name}' workspace.`, commandName: LOCK_WORKSPACE_COMMAND });
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

    if (tfchelper.runIsAwitingPolicyOverride(currentRun)) {
      items.push({ label: '$(pass) Override current run', description: `Override and continue the run '${currentRun.id}'.`, commandName: OVERRIDE_RUN_COMMAND });
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
    case UNLOCK_WORKSPACE_COMMAND:
    case LOCK_WORKSPACE_COMMAND:
      vscode.commands.executeCommand(result.commandName, workspace);
      break;
    case OVERRIDE_RUN_COMMAND:
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

  let items = [];
  items.push({ label: 'Allow empty apply', description: `Apply plans with no changes.`, commandName: "empty_apply" });
  items.push({ label: 'Enable auto apply', description: `Automatically apply changes.`, commandName: "auto_apply" });
  items.push({ label: 'Plan only', description: `Do not apply changes`, commandName: "plan_only" });

  const result = await vscode.window.showQuickPick(items, { canPickMany: true, placeHolder: "Create a new run" });
  if (result === undefined) { return; }

  result.forEach((item) => {
    switch (item.commandName) {
      case "auto_apply":
        defn.autoApply = true;
        break;
      case "empty_apply":
        defn.emptyApply = true;
        break;
      case "plan_only":
        defn.planOnly = true;
        break;
    }
  });

  return defn;
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
  await client.runs.applyRun(run.id, { comment: comment.trim() });

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
  await client.runs.cancelRun(run.id, { comment: comment.trim() });

  vscode.window.showInformationMessage(`Run '${run.id}' has been canceled.`);
}

async function discardRunCommand(config: IConfiguration, run: tfc.Run): Promise<void> {
  // TODO: Check if the run is approvable... tfchelper.runIsConfirmable(currentRun)

  const comment = await vscode.window.showInputBox({
    title: "Discard a run - Enter a comment for the discard",
    placeHolder: "Optional comment",
  });

  if (comment === undefined) {
    return;
  }

  const client = await tfchelper.createClient(config);
  await client.runs.discardRun(run.id, { comment: comment.trim() });

  vscode.window.showInformationMessage(`Run '${run.id}' has been discarded.`);
}


async function overrideRunCommand(config: IConfiguration, run: tfc.Run): Promise<void> {
  // TODO: Check if the run is override-able...

  const comment = await vscode.window.showInputBox({
    title: "Override policy failure for a run - Enter a comment for the override",
    placeHolder: "Optional comment",
  });

  if (comment === undefined) {
    return;
  }

  try {
    const client = await tfchelper.createClient(config);
    const polchks = await client.runs.listRunPolicyChecks(run.id);

    for (let index = 0; index < polchks.data.length; index++) {
      const check = polchks.data[index];
      if (check.attributes.actions?.["is-overridable"] === true) {
        if (check.attributes.permissions?.["can-override"]) {

          try {
            await client.policyChecks.overridePolicyCheck(check.id, { comment: comment.trim() });
            vscode.window.showInformationMessage(`Policy check '${check.id}' has been overriden.`);
          } catch (e: any) {
            if (e instanceof tfc.ApiError) {
              if (e.status === 409) {
                vscode.window.showErrorMessage(
                  `Policy check ${check.id} cannot be overriden right now.`
                );
                return;
              }
              vscode.window.showErrorMessage(`Failed to override policy check '${check.id}': ${e}`);
              return;
            }
            throw e;
          }
        } else {
          vscode.window.showErrorMessage(
            `Failed to override ${check.id} as you do not have the permission to perform the override action.`
          );
        }
      }
    }
  } catch (e: any) {
    if (e instanceof tfc.ApiError) {
      if (e.status === 401) {
        vscode.window.showErrorMessage(
          "Failed to get the selected Run. Please sign out and try again."
        );
        return;
      }
      vscode.window.showErrorMessage(`Failed to override policy for Run '${run.id}': ${e}`);
      return;
    }
    throw e;
  }
}

async function unlockWorkspaceCommand(config: IConfiguration, session: ITfcSession, workspace: tfc.Workspace): Promise<void> {
  const client = await tfchelper.createClient(config);
  try {
    // The {} is a hack to force the correct client behaviour and send a content-type
    const result = await client.workspaces.unlockWorkspace(workspace.id, {});

    if (result.data.attributes.locked !== false) {
      vscode.window.showErrorMessage(`Failed to unlock Workspace '${workspace.attributes.name}'`);
    } else {
      vscode.window.showInformationMessage(`Workspace '${workspace.attributes.name}' has been unlocked.`);
      session.changeInWorkspace(workspace);
    }
  } catch (e: any) {
    if (e instanceof tfc.ApiError) {
      // HTTP 401 Unauthorized
      if (e.status === 401) {
        vscode.window.showErrorMessage(
          "Failed to get the selected Organization. You need to use an Access Token that has access to all organizations. Please sign out and try again."
        );
        return;
      }
      vscode.window.showErrorMessage(`Failed to unlock Workspace '${workspace.attributes.name}': ${e}`);
      return;
    }
    throw e;
  }
}

async function lockWorkspaceCommand(config: IConfiguration, session: ITfcSession, workspace: tfc.Workspace): Promise<void> {
  // TODO: Check if the workspace is lockable

  const comment = await vscode.window.showInputBox({
    title: "Lock a workspace - Enter a comment for the reason",
    placeHolder: "Optional comment",
  });

  if (comment === undefined) {
    return;
  }

  const client = await tfchelper.createClient(config);
  try {
    const result = await client.workspaces.lockWorkspace(workspace.id, { comment: comment });

    if (result.data.attributes.locked !== true) {
      vscode.window.showErrorMessage(`Failed to lock Workspace '${workspace.attributes.name}'`);
    } else {
      vscode.window.showInformationMessage(`Workspace '${workspace.attributes.name}' has been locked.`);
      session.changeInWorkspace(workspace);
    }
  } catch (e: any) {
    if (e instanceof tfc.ApiError) {
      // HTTP 401 Unauthorized
      if (e.status === 401) {
        vscode.window.showErrorMessage(
          "Failed to get the selected Organization. You need to use an Access Token that has access to all organizations. Please sign out and try again."
        );
        return;
      }
      vscode.window.showErrorMessage(`Failed to lock Workspace '${workspace.attributes.name}': ${e}`);
      return;
    }
    throw e;
  }
}

export function registerTerrafromCloudApiCommands(
  config: IConfiguration,
  session: ITfcSession,
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
    vscode.commands.registerCommand(DISCARD_RUN_COMMAND, async (run: tfc.Run) => {
      discardRunCommand(config, run);
    }),
    vscode.commands.registerCommand(UNLOCK_WORKSPACE_COMMAND, async (ws: tfc.Workspace) => {
      unlockWorkspaceCommand(config, session, ws);
    }),
    vscode.commands.registerCommand(LOCK_WORKSPACE_COMMAND, async (ws: tfc.Workspace) => {
      lockWorkspaceCommand(config, session, ws);
    }),
    vscode.commands.registerCommand(OVERRIDE_RUN_COMMAND, async (run: tfc.Run) => {
      overrideRunCommand(config, run);
    }),
  ];
}
