// import * as tfc from "./tfc/types";
// import { TerraformCloud } from "./tfc/api";
import * as tfc from './tfcApi';
import * as responses from './tfcApiExtensions/responses';
// import { RepositoryList } from "./git/types";
import { currentSession, TerrafromCloudAPIAuthenticationProvider } from "./providers/authProvider";
import { IConfiguration } from "./configuration";
import { LruCache } from "./simpleCache";
import { createTfcClient } from './tfcApiExtensions/TfcClient';

// Private cache to speed up lookups
let orgCache: LruCache<tfc.Organization> = new LruCache<tfc.Organization>(10);
let workspaceCache: LruCache<tfc.Workspace> = new LruCache<tfc.Workspace>(20);
// //let runsCache: LruCache<tfc.Workspace> = new LruCache<tfc.Workspace>(10);

// export function findWorkspaceFromRepositoryList(
//   list: RepositoryList,
//   config: IConfiguration
// ): Promise<tfc.Workspace | undefined> {
//   let remotes: string[] = [];
//   list.forEach((repo) => {
//     repo.remotes.forEach((remote) => {
//       let actualRemote = mungeRemote(remote);
//       if (!remotes.includes(actualRemote)) {
//         remotes.push(actualRemote);
//       }
//     });
//   });

//   return findWorkspaceByGitRemotes(remotes, config);
// }

// function mungeRemote(value: string): string {
//   if (value.includes("github.com")) {
//     // This is a github URL
//     // Trim trailing '.git'
//     if (value.endsWith(".git")) {
//       value = value.substring(0, value.length - 4);
//     }
//   }

//   return value;
// }

// export async function findWorkspaceByGitRemotes(
//   remotes: string[],
//   config: IConfiguration
// ): Promise<tfc.Workspace | undefined> {
//   let client = await createClient(config);

//   return findInAllWorkspaces(client, (workspace) => {
//     let url = workspace.attributes.vcsRepo?.repositoryHttpUrl;
//     return url !== undefined && remotes.includes(url);
//   });
// }

// export async function findInAllWorkspaces(
//   client: TerraformCloud,
//   findFunc: (w: tfc.Workspace) => boolean
// ): Promise<tfc.Workspace | undefined> {
//   // TODO: This is ineffecient, but at last it works...
//   const orgs = await getOrganizations(client);

//   for (let index = 0; index < orgs.length; index++) {
//     const ws = await findWorkspaceInOrganization(client, orgs[index], findFunc);
//     if (ws !== undefined) {
//       return ws;
//     }
//   }
//   return undefined;
// }

// export async function findWorkspaceInOrganization(
//   client: TerraformCloud,
//   organization: tfc.Organization,
//   findFunc: (w: tfc.Workspace) => boolean
// ): Promise<tfc.Workspace | undefined> {
//   // TODO: This is ineffecient, but at last it works...
//   const workspaces = await getOrganizationWorkspaces(client, organization);

//   for (let index = 0; index < workspaces.length; index++) {
//     if (findFunc(workspaces[index])) {
//       return workspaces[index];
//     }
//   }
//   return undefined;
// }

// TFC API Calls
export async function createClient(
  config: IConfiguration
): Promise<tfc.TfcClient> {
  const session = await currentSession(false, config);
  return createTfcClient(session.accessToken, config.apiUrl);
}

export async function getOrganizations(
  client: tfc.TfcClient
): Promise<tfc.Organization[]> {
  return client.organizations.listOrganizations().then(
    (response) => {
      // Cache it!
      response.data.forEach((org: tfc.Organization) => {
        orgCache.put(org.id, org);
      });
      return response.data;
    }
  );
}

export async function getOrganization(
  client: tfc.TfcClient | undefined,
  orgName: string,
  useCache: boolean = false
): Promise<tfc.Organization | undefined> {
  if (orgName === "") {
    return undefined;
  }
  if (useCache) {
    // Is it in the cache?
    let org = orgCache.get(orgName);
    if (org !== undefined) {
      return org;
    }
  }
  if (client === undefined) {
    return undefined;
  }
  // Fetch it

  return client.organizations.showOrganization(orgName).then(
    (response) => {
      if (response.data !== undefined) {
        // Cache it!
        orgCache.put(response.data.id, response.data);
      }
      return response.data;
    }
  );
}
export async function getOrganizationIdWorkspaces(
  client: tfc.TfcClient,
  organizationId: string
): Promise<tfc.Workspace[]> {
  return client.organizations.listWorkspaces(organizationId).then(
    (response) => {
      // Cache it!
      response.data.forEach((workspace: tfc.Workspace) => {
        workspaceCache.put(workspace.id, workspace);
      });
      return response.data;
    }
  );
}

export async function getOrganizationWorkspaces(
  client: tfc.TfcClient,
  org: tfc.Organization
): Promise<tfc.Workspace[]> {
  return getOrganizationIdWorkspaces(client, org.attributes.name);
}

export async function getWorkspace(
  client: tfc.TfcClient | undefined,
  workspaceId: string,
  useCache: boolean = false
): Promise<tfc.Workspace | undefined> {
  if (workspaceId === "") {
    return undefined;
  }
  if (useCache) {
    // Is it in the cache?
    let ws = workspaceCache.get(workspaceId);
    if (ws !== undefined) {
      return ws;
    }
  }
  if (client === undefined) {
    return undefined;
  }
  // Fetch it

  return client.workspaces.showWorkspace(workspaceId).then(
    (response) => {
      if (response.data !== undefined) {
        // Cache it!
        workspaceCache.put(response.data.id, response.data);
      }
      return response.data;
    }
  );
}

export async function getWorkspaceByName(
  client: tfc.TfcClient | undefined,
  orgName: string,
  workspaceName: string,
  useCache: boolean = false,
): Promise<tfc.Workspace | undefined> {
  if (client === undefined || orgName === "" || workspaceName === "") {
    return undefined;
  }
  if (useCache) {
    // TODO
    // // Is it in the cache?
    // let ws = workspaceCache.get(workspaceId);
    // if (ws !== undefined) {
    //   return ws;
    // }
  }

  // Fetch it
  return client.workspaces.showWorkspaceByName(orgName, workspaceName).then(
    (response) => {
      if (response.data !== undefined) {
        // Cache it!
        workspaceCache.put(response.data.id, response.data);
      }
      return response.data;
    }
  );
}

async function wrapTfcApi<T>(proc: () => Promise<T>, defaultValue: T): Promise<T> {
  try {
    return await proc();
  } catch (e) {
    console.log("Error occurred", e);
    return defaultValue;
  }
}

export async function getRun(
  client: tfc.TfcClient,
  runId: string,
  _useCache: boolean = false,
  include?: string[]
): Promise<responses.RunResponse | undefined> {
  return wrapTfcApi<responses.RunResponse | undefined>(() => {
    return client.runs.showRun(runId, include).then(
      (response) => {
        return new responses.RunResponse(response.data, response.included);
      });
  }, undefined);
}

export async function getRuns(
  client: tfc.TfcClient,
  workspaceId: string,
  _useCache: boolean = false
): Promise<tfc.Run[] | undefined> {
  return client.workspaces.listWorkspaceRuns(workspaceId).then((result) => result.data);
}

export async function getPlan(
  client: tfc.TfcClient,
  planId: string,
  _useCache: boolean = false
): Promise<tfc.Plan | undefined> {
  return client.plans.showPlan(planId).then((result) => result.data);
}

export async function getApply(
  client: tfc.TfcClient,
  applyId: string,
  _useCache: boolean = false
): Promise<tfc.Apply | undefined> {
  return client.applies.showApply(applyId).then((result) => result.data);
}

export async function getCostEstimate(
  client: tfc.TfcClient,
  costEstimateId?: string,
  _useCache: boolean = false
): Promise<tfc.CostEstimate | undefined> {
  if (costEstimateId === undefined) {
    return undefined;
  }
  return client.costEstimates.showCostEstimate(costEstimateId).then(
    (result) => result.data
  );
}

export async function getTaskStages(
  client: tfc.TfcClient,
  runId?: string,
  _useCache: boolean = false
): Promise<tfc.TaskStage[] | undefined> {
  if (runId === undefined) {
    return undefined;
  }
  return client.taskStages.listRunTaskStages(runId).then((result) => result.data);
}

export async function getTaskStagesWithResults(
  client: tfc.TfcClient,
  runId?: string,
  _useCache: boolean = false
): Promise<responses.TaskStagesResponse | undefined> {
  if (runId === undefined) {
    return undefined;
  }
  return client.runs.listRunTaskStages(runId, ["task-results"]);
}

export async function getTaskResult(
  client: tfc.TfcClient,
  resultId: string,
  _useCache: boolean = false
): Promise<tfc.TaskResult | undefined> {
  return client.taskResults.showTaskResult(resultId).then((result) => result.data);
}

// URL Conversion Functions
export async function urlForOrganization(
  item: tfc.Organization,
  root: string
): Promise<string | undefined> {
  return root + "/app/" + encodeURIComponent(item.attributes.name);
}

export async function urlForWorkspace(
  item: tfc.Workspace,
  root: string
): Promise<string | undefined> {
  if (item.relationships?.organization?.data?.id === undefined) {
    return;
  }

  return (
    root +
    "/app/" +
    encodeURIComponent(item.relationships.organization.data.id) +
    "/workspaces/" +
    encodeURIComponent(item.attributes.name)
  );
}

export async function urlForRun(
  item: tfc.Run,
  root: string,
  client?: tfc.TfcClient
): Promise<string | undefined> {
  let workspaceId = item.relationships?.workspace?.data?.id;
  if (workspaceId === undefined) {
    return undefined;
  }

  const ws = await getWorkspace(client, workspaceId, true);
  if (ws === undefined) {
    return undefined;
  }

  let orgId = ws.relationships?.organization?.data?.id;
  if (orgId === undefined) {
    return undefined;
  }

  return (
    root +
    "/app/" +
    encodeURIComponent(orgId) +
    "/workspaces/" +
    encodeURIComponent(ws.attributes.name) +
    "/runs/" +
    item.id
  );
}

// TFC Run Helpers
export function runIsAwitingConfirmation(run: tfc.Run): boolean {
  if (run?.attributes?.actions?.["is-confirmable"] === undefined) {
    return false;
  }
  return run.attributes.actions["is-confirmable"];
}

// export function prettyRunStatus(status: string): string {
//   // TODO: Get rid of this method
//   return prettyStatus(status);
// }

export function runStatusIsSuccess(run: tfc.Run): boolean {
  const status = run.attributes.status;
  return (
    status === "discarded" ||
    status === "applied" ||
    status === "planned_and_finished"
  );
}

export function runStatusIsCompleted(run: tfc.Run): boolean {
  const status = run.attributes.status;
  return (
    status === "errored" ||
    status === "applied" ||
    status === "discarded" ||
    status === "planned_and_finished" ||
    status === "policy_soft_failed" ||
    status === "canceled"
  );
}

export function runStatusHasPlan(run: tfc.Run): boolean {
  const status = run.attributes.status;
  return (
    status === "planned" ||
    status === "confirmed" ||
    status === "apply_queued" ||
    status === "applying" ||
    status === "applied" ||
    status === "discarded" ||
    status === "cost_estimating" ||
    status === "cost_estimated" ||
    status === "policy_checking" ||
    status === "policy_override" ||
    status === "policy_soft_failed" ||
    status === "policy_checked" ||
    status === "planned_and_finished" ||
    status === "post_plan_running" ||
    status === "post_plan_completed" ||
    status === "pre_apply_running" ||
    status === "pre_apply_completed"
  );
}

// export function runStatusHasApply(run: tfc.Run): boolean {
//   const status = run.attributes.status;
//   return status === "applied";
// }

// // export function runHasStatusTimestamp(run: tfc.Run, eventName: string): boolean {
// //   const status = run.attributes.status;
// //   return status === "applied";
// // }

export function valueToDate(value?: Date | string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value instanceof Date) {
    return value;
  } else {
    return new Date(value);
  }
}

export function prettyDate(value?: Date): string {
  if (value === undefined) {
    return "Unknown";
  }

  //TODO: Don't like this format.... oh well

  return value.toLocaleString();
}

export function valueToPrettyDate(value?: Date | string): string {
  return prettyDate(valueToDate(value));
}

export function runStatusIcon(run: tfc.Run): string {
  const status = run.attributes.status;
  if (runStatusIsCompleted(run)) {
    if (runStatusIsSuccess(run)) {
      return "pass";
    } else if(run.attributes.status === "errored") {
      return "error";
    } else {
      return "stop";
    }
  } else {
    if (runIsAwitingConfirmation(run)) {
      return "report";
    } else if (run.attributes.status === "pending") {
      return "watch";
    } else {
      return "debug-start";
    }
  }
}

export function prettyStatus(value?: string): string {
  if (value === undefined) { return ""; }
  value = value.replace(/_/g, " ");
  value = value.replace(/-/g, " ");
  return value[0].toUpperCase() + value.substring(1);
}

export function runIsDiscardable(run: tfc.Run): boolean {
  return (
    run.attributes.actions?.['is-discardable'] === true &&
    run.attributes.permissions['can-discard'] === true
  );
}

export function runIsCancelable(run: tfc.Run): boolean {
  return (
    run.attributes.actions?.['is-cancelable'] === true &&
    run.attributes.permissions['can-cancel'] === true
  );
}

export function runIsConfirmable(run: tfc.Run): boolean {
  // TODO: Can't find a permission for this
  return runIsAwitingConfirmation(run);
}

// Finds resources in the included list
export function includedFilter<T>(typeName:string, included?: tfc.IncludedResources): T[] {
  const items: T[] = [];
  if (included === undefined) { return items; }
  included.forEach((item) => {
    if (item.type === typeName) {
      items.push(item as unknown as T);
    }
  });

  return items;
}

// Finds a resource in the included list
export function includedFind<T>(typeName:string, included?: tfc.IncludedResources): T | undefined {
  if (included === undefined) { return undefined; }
  let item = included.find((i) => i.type === typeName);
  if (item === undefined) { return undefined; }
  return item as unknown as T;
}

export class RunBuilder {
  //public isDestroy?: boolean;
  public message?: string;
  public workspaceId: string;
  public allowEmptyApply?: boolean;
  public autoApply?: boolean;
  public planOnly?: boolean;
  //public configurationVersionId?: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  public withMessage(message: string): RunBuilder {
    this.message = message;
    return this;
  }

  public withAutoApply(value: boolean): RunBuilder {
    this.autoApply = value;
    return this;
  }

  public withEmptyApply(value: boolean): RunBuilder {
    this.allowEmptyApply = value;
    return this;
  }

  public withPlanOnly(value: boolean): RunBuilder {
    this.planOnly = value;
    return this;
  }

  public build(): tfc.RunCreateRequest {
    return {
      data: {
        attributes: {
          //isDestroy: this.isDestroy,
          message: this.message,
          "auto-apply": this.autoApply,
          "allow-empty-apply": this.allowEmptyApply,
        },
        relationships: {
          workspace: {
            data: {
              id: this.workspaceId,
              type: "workspaces",
            },
          },
        },
      },
    };
  }
}
