import * as vscode from 'vscode';
import * as tfchelper from './tfcHelpers';
import * as tfc from './tfcApi';
//import { TerraformCloud } from './tfc/api';
import { IConfiguration } from "./configuration";
import { TFC_FILESYSTEM_SCHEME } from './providers/tfcFileSystemProvider';
//import { TaskResult } from './tfc/types';
import * as responses from './tfcApiExtensions/responses';

export function showTfcRunMarkdownPreview(config: IConfiguration, runId: string): void {
  return showTfcMarkdownPreview(config, `/runs/${runId}`);
}

export function showTfcMarkdownPreview(config: IConfiguration, path: string): void {
  const tfcResource = vscode.Uri.from(
    { scheme: TFC_FILESYSTEM_SCHEME, authority: config.apiURLAuthority, path: path }
  );
  vscode.commands.executeCommand("markdown.showPreview", undefined, [tfcResource], { locked: true });
}

export async function runIdAsMarkdown(config: IConfiguration, runId: string, useCache: boolean): Promise<string | undefined> {
  const client = await tfchelper.createClient(config);
  return tfchelper.getRun(client, runId, useCache, ["plan", "apply", "cost_estimate"]).then((run) => {
    if (run === undefined) {
      return undefined;
    } else {
      return runAsMarkdown(config, run);
    }
  });
}

async function runAsMarkdown(config: IConfiguration, response: responses.RunResponse): Promise<string> {
  const run = response.data;
  const client = await tfchelper.createClient(config);
  // Plan
  let plan = tfchelper.includedFind<tfc.Plan>("plan", response.included);
  if (plan === undefined && run.relationships?.plan?.data?.id !== undefined) {
    plan = await tfchelper.getPlan(client, run.relationships.plan.data.id);
  }
  // Apply
  let apply = tfchelper.includedFind<tfc.Apply>("apply", response.included);
  if (apply === undefined && run.relationships?.apply?.data?.id !== undefined) {
    apply = await tfchelper.getApply(client, run.relationships.apply.data.id);
  }
  // Optional things
  const costEstimate = await tfchelper.getCostEstimate(client, run.relationships?.['cost-estimate']?.data?.id);
  const taskStages = await tfchelper.getTaskStagesWithResults(client, run.id);

  let content = `
  # Run details

  ${run.attributes.message}

  | Property | Value |
  |----------|-------|
  | Id | [${run.id}](${await tfchelper.urlForRun(run, config.apiUrl)}) |
  | Auto Apply | ${boolAsYesNo(run.attributes['auto-apply'])} |
  | Will Destroy | ${boolAsYesNo(run.attributes['is-destroy'])} |
  | Terraform Version | ${run.attributes['terraform-version']} |
  | Status | ${tfchelper.prettyStatus(run.attributes.status)} |
  | Workspace | xxx |
  `;

  if (taskStages !== undefined) {
    content += await taskStagesResponseAsMarkdown(taskStages, "pre_plan");;
  }

  if (plan !== undefined && plan.attributes.status !== 'unreachable') {
    content += planAsMarkdown(plan);
  }

  if (taskStages !== undefined) {
    content += await taskStagesResponseAsMarkdown(taskStages, "post_plan");;
  }

  if (costEstimate !== undefined) {
    content += costEstimateAsMarkdown(costEstimate);
  }

  // ## Policy Checks

  // ## Post-Plan

  content += "\n---\n";
  // ## Pre-Apply

  if (apply !== undefined && apply.attributes.status !== 'unreachable') {
    content += applyAsMarkdown(apply);
  }

  return content;
};

function boolAsYesNo(value?: boolean): string {
  if (value === undefined) { return ""; }
  return value ? "Yes" : "No";
}

function numberAsCurrency(value?: number | string, showPlusMinus: boolean = false): string {
  if (value === undefined) { return ""; }
  let prefix = "";
  if (showPlusMinus) {
    if (Number(value) < 0) {
      prefix += "-";
    } else {
      prefix += "+";
    }
  }

  return prefix + "$" + Number(value).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

async function taskStagesResponseAsMarkdown(response: responses.TaskStagesResponse, stageName: string): Promise<string> {
  if (response.data === undefined) { return ""; }
  const stage = response.data.find((item) => {
    return item.attributes.stage === "post_plan";
  });
  if (stage === undefined) { return ""; }

  const results = await taskResultsForStage(stage, response);

  return taskStageWithResultsAsMarkdown(stage, results);
}

async function taskResultsForStage(stage: tfc.TaskStage, response: responses.TaskStagesResponse): Promise<tfc.TaskResult[]> {
  if (stage.relationships?.['task-results']?.data === undefined) { return []; }

  const resultIds: string[] = [];
  for (let index = 0; index < stage.relationships['task-results'].data.length; index++) {
    resultIds.push(stage.relationships['task-results'].data[index].id);
  }

  const results = tfchelper.includedFilter<tfc.TaskResult>('task-results', response.included).filter((result) => {
    return resultIds.includes(result.id);
  });

  return results;
}

function taskStageWithResultsAsMarkdown(stage: tfc.TaskStage | undefined, results: tfc.TaskResult[] | undefined): string {
  if (stage === undefined || results === undefined) { return ""; }

  let content = `
  ## ${tfchelper.prettyStatus(stage.attributes.stage)} tasks

  `;

  if (stage.attributes.status !== "passed" && stage.attributes.status !== "failed") {
    content += "Task stage is not available. It is currently " + tfchelper.prettyStatus(stage.attributes.status) + ".\n";
    return content;
  }

  content += `The task stage ${tfchelper.prettyStatus(stage.attributes.status)} at ${tfchelper.valueToPrettyDate(stage.attributes['updated-at'])}\n\n`;

  content += "| Name | Status | Details |\n";
  content += "| ---- | ------ | ------- |\n";
  results.forEach((result) => {
    let msg = "";
    if (result.attributes.message !== undefined) {
      msg += result.attributes.message.replace("|"," ").replace("\n"," ") + ". ";
    }
    if (result.attributes.url !== undefined) {
      msg += `[Link](${result.attributes.url})`;
    }

    content += `| ${result.attributes['task-name']} | ${result.attributes.status} | ${msg.trim()} |\n`;
  });

  return content;
}

function planAsMarkdown(plan: tfc.Plan): string {
  if (plan.attributes.status === "unreachable") { return ""; }

  let content = `
  ## Plan

  `;

  if (plan.attributes.status !== "finished") {
    content += "Plan is not available. It is currently " + tfchelper.prettyStatus(plan.attributes.status) + ".\n";
    return content;
  }

  if (plan.attributes['log-read-url'] !== "") {
    content += "The log file for the plan can be found at this [link](" + plan.attributes['log-read-url'] + ").\n";
  }

  return content + `
  Resources: **${plan.attributes['resource-additions']}** to add, **${plan.attributes['resource-changes']}** to change, **${plan.attributes['resource-destructions']}** to delete

  Started at ${tfchelper.valueToPrettyDate(plan.attributes['status-timestamps']?.['started-at'])} and finished at ${tfchelper.valueToPrettyDate(plan.attributes['status-timestamps']?.['finished-at'])}
  `;
}

function costEstimateAsMarkdown(estimate: tfc.CostEstimate): string {
  if (estimate.attributes.status === "unreachable") { return ""; }

  let content = `
  ## Cost Estimate

  `;

  if (estimate.attributes.status !== "finished") {
    content += "Cost estimate is not available. It is currently " + tfchelper.prettyStatus(estimate.attributes.status) + ".\n";
    return content;
  }

  return content + `
  Estimated **${estimate.attributes['matched-resources-count']}** of **${estimate.attributes['resources-count']}** resources, for a cost of **${numberAsCurrency(estimate.attributes['proposed-monthly-cost'])}** per month.
  A change of **${numberAsCurrency(estimate.attributes['delta-monthly-cost'], true)}** per month.
  `;
}

function applyAsMarkdown(apply: tfc.Apply): string {
  if (apply.attributes.status === "unreachable") { return ""; }

  let content = `
  ## Apply

  `;

  if (apply.attributes.status !== "finished") {
    content += "Apply is not available. It is currently " + tfchelper.prettyStatus(apply.attributes.status) + ".\n";
    return content;
  }

  return content + `
  Resources: ${apply.attributes['resource-additions']} to add, ${apply.attributes['resource-changes']} to change, ${apply.attributes['resource-destructions']} to delete

  Started: ${tfchelper.valueToPrettyDate(apply.attributes['status-timestamps']?.['started-at'])}

  Finished: ${tfchelper.valueToPrettyDate(apply.attributes['status-timestamps']?.['finished-at'])}
  `;
}
