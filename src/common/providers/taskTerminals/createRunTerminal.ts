import * as vscode from "vscode";
import * as tfchelper from "../../tfcHelpers";
import * as tfc from "../../tfcApi";
import * as ansi from "./ansi";
import { IConfiguration } from "../../configuration";
import { TerraformCloudTaskTerminal, TerminalWriter } from "./abstract";
import { TASK_TYPE } from "../taskProvider";

export class TfcCreateRunDefinition {
  public type: string = TASK_TYPE;
  public workspaceId: string = "";
  public workspaceName: string = "";
  public message: string = "";
}

const DELAY_BACK_OFF = 1.5;
const DELAY_MAXIMUM = 30000;
const DELAY_MINIMUM = 2000;

async function consoleUrlForRun(
  config: IConfiguration,
  run: tfc.Run
): Promise<string | undefined> {
  return tfchelper.urlForRun(run, config.apiUrl);
}

export class TfcCreateRunTerminal extends TerraformCloudTaskTerminal {
  private taskDefinition: TfcCreateRunDefinition;

  constructor(config: IConfiguration, defn: TfcCreateRunDefinition) {
    super(config);
    this.taskDefinition = defn;
  }

  async doTask(
    _initialDimensions: vscode.TerminalDimensions | undefined,
    cancelToken: vscode.CancellationToken
  ): Promise<void> {
    this.writeEmitter.fire("Starting Terraform Cloud Task Terminal...\r\n");
    let run: tfc.Run;
    let client: tfc.TfcClient;

    try {
      client = await tfchelper.createClient(this.config);

      if (cancelToken.isCancellationRequested) {
        return;
      }

      this.writeEmitter.fire("Validating workspace...\r\n");
      const workspace = await tfchelper.getWorkspace(
        client,
        this.taskDefinition.workspaceId
      );

      if (cancelToken.isCancellationRequested) {
        return;
      }

      if (workspace === undefined) {
        this.writeEmitter.fire(
          `Workspace ${this.taskDefinition.workspaceId} was not found.\r\n`
        );
        this.closeEmitter.fire(0);
        return;
      }
      this.writeEmitter.fire("Validating permissions...\r\n");
      if (!workspace.attributes.permissions["can-queue-run"]) {
        this.writeEmitter.fire(
          `You do not have permission to create a run in ${workspace.attributes.name}.\r\n`
        );
        this.closeEmitter.fire(0);
        return;
      }

      this.writeEmitter.fire("Creating run...\r\n");
      // TODO: use the task definition
      const req = new tfchelper.RunBuilder(workspace.id)
        .withMessage(this.taskDefinition.message)
        //.withEmptyApply()
        //.withAutoApply()
        .build();
      run = (await client.runs.createRun(req)).data;

      if (cancelToken.isCancellationRequested) {
        return;
      }

      const runURL = await consoleUrlForRun(this.config, run);
      if (runURL === undefined) {
        throw new Error("Could not create a Run");
      }
      this.writeEmitter.fire(
        `Run created with id ${ansi.YELLOW_FORE}${run.id}${ansi.RESET}. Browse to ${runURL} for more detailed information.\r\n`
      );
      this.writeEmitter.fire(
        `\r\nIf you close this terminal, the Run will continue.\r\n\r\n`
      );
    } catch (e: any) {
      this.writeEmitter.fire(`An error occured: ${e}.\r\n`);
      this.closeEmitter.fire(0);
      return;
    }

    const poller = new RunStatusPoller(
      this.config,
      client,
      run.id,
      this.writeEmitter,
      cancelToken
    );
    return poller.poll().then(() => {
      this.closeEmitter.fire(0);
    });
  }
}

class SeenRunTimeStamps {
  plannedAt?: string;
  appliedAt?: string;
  postPlanCompletedAt?: string;
}

class RunStatusPoller {
  private config: IConfiguration;
  private client: tfc.TfcClient;
  private runId: string;
  private writer: TerminalWriter;
  private seen: SeenRunTimeStamps = new SeenRunTimeStamps();
  private timeDelayMs = DELAY_MINIMUM;
  private timer?: number;
  private lastRunStatus: string = "";
  private cancelToken: vscode.CancellationToken;

  constructor(
    config: IConfiguration,
    client: tfc.TfcClient,
    runId: string,
    writer: TerminalWriter,
    cancelToken: vscode.CancellationToken
  ) {
    this.config = config;
    this.client = client;
    this.runId = runId;
    this.writer = writer;
    this.seen = new SeenRunTimeStamps();
    this.cancelToken = cancelToken;
  }

  public poll(): Promise<void> {
    const poller = new Promise<void>((resolve) => {
      // TODO: Clear time if it's already set.
      // Trigger a poll immediately
      this.timer = setTimeout(this.doTimeout, 10, resolve, this);
    }).then(() => {
      if (this.timer !== undefined) {
        clearTimeout(this.timer);
      }
    });

    return poller;
  }

  private async doTimeout(
    resolve: any,
    poller: RunStatusPoller
  ): Promise<void> {
    poller.doPoll(resolve);
  }

  private async doPoll(resolve: any): Promise<void> {
    if (this.cancelToken.isCancellationRequested) {
      return resolve();
    }

    let run = (await this.client.runs.showRun(this.runId)).data;
    if (run.attributes.status !== this.lastRunStatus) {
      this.lastRunStatus = run.attributes.status;
      this.timeDelayMs = DELAY_MINIMUM;
      await this.checkRunStatusTimestamps(this.client, run);
      if (this.cancelToken.isCancellationRequested) {
        return resolve();
      }
      await this.writeRunStatus(run);
    } else {
      this.timeDelayMs = this.timeDelayMs * DELAY_BACK_OFF;
      if (this.timeDelayMs > DELAY_MAXIMUM) {
        this.timeDelayMs = DELAY_MAXIMUM;
      }
    }

    if (this.cancelToken.isCancellationRequested) {
      return resolve();
    } else if (tfchelper.runStatusIsCompleted(run)) {
      this.writer.fire("Run has completed.");
      return resolve();
    } else {
      this.timer = setTimeout(this.doTimeout, this.timeDelayMs, resolve, this);
    }
  }

  private async writeRunStatus(run: tfc.Run): Promise<void> {
    this.writer.fire(
      `Run is ${ansi.YELLOW_FORE}${tfchelper.prettyStatus(
        run.attributes.status
      )}${ansi.RESET}\r\n`
    );
    if (tfchelper.runIsAwitingConfirmation(run)) {
      const runURL = await consoleUrlForRun(this.config, run);
      this.writer.fire(
        `The Run is waiting for confirmation. Browse to ${runURL} for more detailed information.\r\n\r\n`
      );
    }
  }

  private async checkRunStatusTimestamps(
    client: tfc.TfcClient,
    run: tfc.Run
  ): Promise<void> {
    // Order is important : Should be in the same
    // order you would see in a run
    if (
      this.seen.plannedAt !==
      run.attributes["status-timestamps"]?.["planned-at"]
    ) {
      this.seen.plannedAt = run.attributes["status-timestamps"]?.["planned-at"];
      await this.writeRunPlan(client, run);
    }

    if (this.cancelToken.isCancellationRequested) {
      return;
    }

    if (
      this.seen.postPlanCompletedAt !==
      run.attributes["status-timestamps"]?.["post-plan-completed-at"]
    ) {
      this.seen.postPlanCompletedAt =
        run.attributes["status-timestamps"]?.["post-plan-completed-at"];
      await this.writeRunTaskStage(client, run, "post_plan");
    }

    if (this.cancelToken.isCancellationRequested) {
      return;
    }

    if (
      this.seen.appliedAt !==
      run.attributes["status-timestamps"]?.["applied-at"]
    ) {
      this.seen.appliedAt = run.attributes["status-timestamps"]?.["applied-at"];
      await this.writeRunApply(client, run);
    }
  }

  private async writeRunPlan(
    client: tfc.TfcClient,
    run: tfc.Run
  ): Promise<void> {
    const planId = run.relationships?.plan?.data?.id;
    if (planId === undefined) { return; }
    const plan = (await client.plans.showPlan(planId)).data;

    if (this.cancelToken.isCancellationRequested) {
      return;
    }

    let output = "Planned resource changes: ";
    output += `${ansi.GREEN_FORE}+${plan.attributes["resource-additions"]} `;
    output += `${ansi.BLUE_FORE}~${plan.attributes["resource-changes"]} `;
    output += `${ansi.RED_FORE}-${plan.attributes["resource-destructions"]}`;
    output += `${ansi.RESET}\r\n`;
    this.writer.fire(output + "\r\n");
  }

  private async writeRunApply(
    client: tfc.TfcClient,
    run: tfc.Run
  ): Promise<void> {
    const applyId = run.relationships?.apply?.data?.id;
    if (applyId === undefined) {
      return;
    }
    const apply = (await client.applies.showApply(applyId)).data;

    if (this.cancelToken.isCancellationRequested) {
      return;
    }

    let output = "Applied resource changes: ";
    output += `${ansi.GREEN_FORE}+${apply.attributes["resource-additions"]} `;
    output += `${ansi.BLUE_FORE}~${apply.attributes["resource-changes"]} `;
    output += `${ansi.RED_FORE}-${apply.attributes["resource-destructions"]}`;
    output += `${ansi.RESET}\r\n`;
    this.writer.fire(output + "\r\n");
  }

  private async writeRunTaskStage(
    client: tfc.TfcClient,
    run: tfc.Run,
    stageName: string
  ): Promise<void> {
    if (run.relationships?.["task-stages"] === undefined) {
      return;
    }

    // Find the task stage we're interested in
    const stages = (await client.runs.listRunTaskStages(run.id)).data; //, {pageNumber}  1, 30);

    if (this.cancelToken.isCancellationRequested) {
      return;
    }

    for (const idx in stages) {
      if (stages[idx].attributes.stage === stageName) {
        await this.writeTaskStageResults(client, stages[idx]);
        return;
      }
    }
  }

  private async writeTaskStageResults(
    client: tfc.TfcClient,
    taskStage: tfc.TaskStage
  ): Promise<void> {
    if (taskStage.relationships?.["task-results"]?.data === undefined) {
      return;
    }
    let output = `${this.prettyStageName(
      taskStage.attributes.stage
    )} Results:\r\n`;

    for (const idx in taskStage.relationships["task-results"].data) {
      const data = taskStage.relationships["task-results"].data[idx];

      const taskResult = (await client.taskResults.showTaskResult(data.id)).data;

      if (taskResult.attributes.status === "passed") {
        output += `${ansi.GREEN_FORE}PASS${ansi.RESET} `;
      } else if (taskResult.attributes.status === "failed") {
        output += `${ansi.GREEN_FORE}FAIL${ansi.RESET} `;
      } else {
        output += `${ansi.YELLOW_FORE}${this.prettyStatusName(
          taskResult.attributes.status
        )}${ansi.RESET} `;
      }
      output += `${taskResult.attributes["task-name"]}`;

      let detail = "";
      if (taskResult.attributes.message !== undefined) {
        detail += `${this.sanitizeMessage(taskResult.attributes.message)}\r\n`;
      }
      if (taskResult.attributes.url !== undefined) {
        detail += `${taskResult.attributes.url}\r\n`;
      }
      if (detail !== "") {
        output += ": " + detail;
      } else {
        output += "\r\n";
      }
    }

    this.writer.fire(output + "\r\n");
  }

  private prettyStageName(value: string): string {
    value = value.replace("_", "-");
    return value[0].toUpperCase() + value.substring(1);
  }

  private prettyStatusName(value: string): string {
    value = value.replace("_", " ");
    value = value.replace("-", " ");
    return value[0].toUpperCase() + value.substring(1);
  }

  private sanitizeMessage(value?: string): string {
    if (value === undefined) {
      return "";
    }
    value = value.replace("\r", "");
    value = value.replace("\n", " ");
    return value;
  }
}
