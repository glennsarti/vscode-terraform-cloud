import * as vscode from "vscode";
import { ITfcSession } from "../tfcSession";
import { IConfiguration } from "../configuration";
import { TfcCreateRunDefinition, TfcCreateRunTerminal } from "./taskTerminals/createRunTerminal";

export const TASK_TYPE = "terraform-cloud";

export interface ITerraformCloudTaskProvider {
  createRunTask(defn: TfcCreateRunDefinition): vscode.Task
}

export class TerraformCloudTaskProvider
  implements vscode.TaskProvider<vscode.Task>, ITerraformCloudTaskProvider
{
  public taskType = TASK_TYPE;
  private session: ITfcSession;
  private config: IConfiguration;

  constructor(config: IConfiguration, session: ITfcSession) {
    this.config = config;
    this.session = session;
  }

  public async provideTasks(): Promise<vscode.Task[]> {
    const tasks: vscode.Task[] = [];

    if (
      this.session.isWatchingWorkspace &&
      this.session.watchingWorkspace !== undefined
    ) {
      // TODO: check perms
      tasks.push(
        this.createRunOnLatestTask(
          this.session.watchingWorkspace.id,
          this.session.watchingWorkspace.attributes.name,
          ""
        )
      );
    }

    return tasks;
  }

  public resolveTask(task: vscode.Task): vscode.Task | undefined {
    return task;
  }

  public createRunOnLatestTask(
    workspaceId: string,
    workspaceName: string,
    message: string
  ): vscode.Task {
    const defn = new TfcCreateRunDefinition();
    defn.type = TASK_TYPE;
    defn.workspaceId = workspaceId;
    defn.workspaceName = workspaceName;
    defn.message = message;

    const exec = new vscode.CustomExecution(
      async (): Promise<vscode.Pseudoterminal> => {
        // When the task is executed, this callback will run. Here, we setup for running the task.
        return new TfcCreateRunTerminal(this.config, this.session, defn);
      }
    );

    return new vscode.Task(
      defn,
      vscode.TaskScope.Workspace,
      `Start a run in ${workspaceName} workspace`,
      TASK_TYPE,
      exec
    );
  }

  public createRunTask(defn: TfcCreateRunDefinition): vscode.Task {
    const exec = new vscode.CustomExecution(
      async (): Promise<vscode.Pseudoterminal> => {
        // When the task is executed, this callback will run. Here, we setup for running the task.
        return new TfcCreateRunTerminal(this.config, this.session, defn);
      }
    );

    return new vscode.Task(
      defn,
      vscode.TaskScope.Workspace,
      `Start a run in ${defn.workspaceName} workspace`,
      TASK_TYPE,
      exec
    );
  }
}

export function registerTerraformCloudTaskProvider(
  provider: TerraformCloudTaskProvider
): vscode.Disposable[] {
  return [
    vscode.tasks.registerTaskProvider(provider.taskType, provider),
    vscode.commands.registerCommand(
      "terraform-cloud.create-a-run",
      async (workspaceId: string, workspaceName: string, message: string) => {
        vscode.tasks.executeTask(
          provider.createRunOnLatestTask(workspaceId, workspaceName, message)
        );
      }
    ),
  ];
}
