import * as vscode from "vscode";
import * as tfchelper from "../../tfcHelpers";
import * as tfc from "../../tfcApi";
import * as ansi from "./ansi";
import { IConfiguration } from "../../configuration";
import { ITfcSession } from "../../tfcSession";
import { TerraformCloudTaskTerminal, TerminalWriter } from "./abstract";
import { TASK_TYPE } from "../taskProvider";

export class TfcCreateRunDefinition {
  public type: string = TASK_TYPE;
  public workspaceId: string = "";
  public workspaceName: string = "";
  public message: string = "";

  public emptyApply: boolean = false;
  public autoApply: boolean = false;
  public planOnly: boolean = false;
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
  private session: ITfcSession;

  constructor(config: IConfiguration, session: ITfcSession, defn: TfcCreateRunDefinition) {
    super(config);
    this.taskDefinition = defn;
    this.session = session;
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
      let builder = new tfchelper.RunBuilder(workspace.id)
        .withMessage(this.taskDefinition.message)
        .withAutoApply(this.taskDefinition.autoApply)
        .withEmptyApply(this.taskDefinition.emptyApply)
        .withPlanOnly(this.taskDefinition.planOnly);

      run = (await client.runs.createRun(builder.build())).data;

      if (cancelToken.isCancellationRequested) {
        return;
      }
      this.session.changeInWorkspace(workspace);

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
  appliedAt?: string;
  plannedAt?: string;
  prePlanCompletedAt?: string;
  postPlanCompletedAt?: string;
  policyCheckedAt?: string;
  preApplyCompletedAt?: string;
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
    } else if (tfchelper.runIsAwitingPolicyOverride(run)) {
      const runURL = await consoleUrlForRun(this.config, run);
      this.writer.fire(
        `The Run is waiting for a policy override. Browse to ${runURL} for more detailed information.\r\n\r\n`
      );
    }
  }

  private async checkRunStatusTimestamps(
    client: tfc.TfcClient,
    run: tfc.Run
  ): Promise<void> {
    // Order is important : Should be in the same
    // order you would see in a run

    // Pre-Plan
    if (
      this.seen.prePlanCompletedAt !==
      run.attributes["status-timestamps"]?.["pre-plan-completed-at"]
    ) {
      this.seen.prePlanCompletedAt =
        run.attributes["status-timestamps"]?.["pre-plan-completed-at"];
      await this.writeRunTaskStage(client, run, "pre_plan");
    }

    if (this.cancelToken.isCancellationRequested) {
      return;
    }

    // Plan
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

    // Post-Plan
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

    // TODO: Cost Estimate

    // Policy Checks : Policy Overrides make it tricky. We can't depend just on the status timestamp
    let policyCheckedAt = run.attributes["status-timestamps"]?.["policy-checked-at"];
    if (policyCheckedAt === undefined && (run.attributes.status === "policy_soft_failed" || run.attributes.status === "policy_override")) {
      policyCheckedAt = Date.now().toString();
    }

    if (this.seen.policyCheckedAt === undefined && policyCheckedAt !== undefined) {
      this.seen.policyCheckedAt = policyCheckedAt;
      await this.writeRunPolicyChecks(client, run);
    }

    // Pre-Apply
    if (
      this.seen.preApplyCompletedAt !==
      run.attributes["status-timestamps"]?.["pre-apply-completed-at"]
    ) {
      this.seen.preApplyCompletedAt =
        run.attributes["status-timestamps"]?.["pre-apply-completed-at"];
      await this.writeRunTaskStage(client, run, "pre_apply");
    }

    if (this.cancelToken.isCancellationRequested) {
      return;
    }

    // Apply
    if (
      this.seen.appliedAt !==
      run.attributes["status-timestamps"]?.["applied-at"]
    ) {
      this.seen.appliedAt = run.attributes["status-timestamps"]?.["applied-at"];
      await this.writeRunApply(client, run);
    }
  }

  private async writeRunPolicyChecks(
    client: tfc.TfcClient,
    run: tfc.Run
  ): Promise<void> {
    if (run.relationships?.["policy-checks"]?.data === undefined) {
      return;
    }

    const polchks = await client.policyChecks.listRunPolicyChecks(run.id);
    if (polchks === undefined) {
      return;
    }

    if (this.cancelToken.isCancellationRequested) {
      return;
    }

    let output = "Policies: ";
    // passed    advisory failed  soft faild
    let passed = 0;
    let advisory = 0;
    let softFailed = 0;
    let hardFailed = 0;
    polchks.data.forEach((polchk) => {
      passed = passed + (polchk.attributes.result.passed || 0);
      advisory = advisory + (polchk.attributes.result["advisory-failed"] || 0);
      softFailed = softFailed + (polchk.attributes.result["soft-failed"] || 0);
      hardFailed = hardFailed + (polchk.attributes.result["hard-failed"] || 0);
    });

    output += `${ansi.YELLOW_FORE}${passed}${ansi.RESET} passed`;
    if (hardFailed > 0) {
      output += `, ${ansi.YELLOW_FORE}${hardFailed}${ansi.RESET} failed`;
    }
    if (softFailed > 0) {
      output += `, ${ansi.YELLOW_FORE}${softFailed}${ansi.RESET} soft failed`;
    }
    if (advisory > 0) {
      output += `, ${ansi.YELLOW_FORE}${advisory}${ansi.RESET} advisory failed`;
    }
    this.writer.fire(output + "\r\n");
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
      if (taskResult.attributes.url !== undefined && taskResult.attributes.url !== null) {
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
