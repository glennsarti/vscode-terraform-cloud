/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IncludedResources } from '../models/IncludedResources';
import type { MetaPagination } from '../models/MetaPagination';
import type { Run } from '../models/Run';
import type { RunCreateRequest } from '../models/RunCreateRequest';
import type { TaskStage } from '../models/TaskStage';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class RunsService {

  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Perform the apply action on a Run
   * @param runId The id of the run
   * @param requestBody Run action comment
   * @returns any HTTP 202 Accepted Response
   * @throws ApiError
   */
  public applyRun(
runId: string,
requestBody?: {
comment?: string;
},
): CancelablePromise<any> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/runs/{run_id}/actions/apply',
      path: {
        'run_id': runId,
      },
      body: requestBody,
      mediaType: 'application/vnd.api+json',
      errors: {
        404: `HTTP 404 Not Found Response`,
        409: `HTTP 409 Conflict Response`,
      },
    });
  }

  /**
   * Perform the cancel action on a Run
   * @param runId The id of the run
   * @param requestBody Run action comment
   * @returns any HTTP 202 Accepted Response
   * @throws ApiError
   */
  public cancelRun(
runId: string,
requestBody?: {
comment?: string;
},
): CancelablePromise<any> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/runs/{run_id}/actions/cancel',
      path: {
        'run_id': runId,
      },
      body: requestBody,
      mediaType: 'application/vnd.api+json',
      errors: {
        404: `HTTP 404 Not Found Response`,
        409: `HTTP 409 Conflict Response`,
      },
    });
  }

  /**
   * Create a Run
   * @param requestBody Create Run Request
   * @returns any Show Run Response
   * @throws ApiError
   */
  public createRun(
requestBody: RunCreateRequest,
): CancelablePromise<{
data: Run;
included?: IncludedResources;
}> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/runs',
      body: requestBody,
      mediaType: 'application/vnd.api+json',
      errors: {
        404: `HTTP 404 Not Found Response`,
        409: `HTTP 409 Conflict Response`,
      },
    });
  }

  /**
   * Perform the discard action on a Run
   * @param runId The id of the run
   * @param requestBody Run action comment
   * @returns any HTTP 202 Accepted Response
   * @throws ApiError
   */
  public discardRun(
runId: string,
requestBody?: {
comment?: string;
},
): CancelablePromise<any> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/runs/{run_id}/actions/discard',
      path: {
        'run_id': runId,
      },
      body: requestBody,
      mediaType: 'application/vnd.api+json',
      errors: {
        404: `HTTP 404 Not Found Response`,
        409: `HTTP 409 Conflict Response`,
      },
    });
  }

  /**
   * Show a run
   * @param runId The id of the run
   * @param include Additional resources to include in the response
   * @returns any Show Run Response
   * @throws ApiError
   */
  public showRun(
runId: string,
include?: Array<string>,
): CancelablePromise<{
data: Run;
included?: IncludedResources;
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/runs/{run_id}',
      path: {
        'run_id': runId,
      },
      query: {
        'include': include,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

  /**
   * Show a task stages in a run
   * @param runId The id of the run
   * @param include Additional resources to include in the response
   * @returns any List Task Stages Response
   * @throws ApiError
   */
  public listRunTaskStages(
runId: string,
include?: Array<string>,
): CancelablePromise<{
data: Array<TaskStage>;
meta?: {
pagination?: MetaPagination;
};
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/runs/{run_id}/task-stages',
      path: {
        'run_id': runId,
      },
      query: {
        'include': include,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

  /**
   * Lists runs in a workspace
   * @param workspaceId The id of the workspace
   * @param pageNumber The page to request. Defaults to the first page
   * @param pageSize The page size to request. Defaults to the 20.
   * @param filterOperation List runs with the specified operations
   * @param filterSource List runs with the specified sources
   * @param filterStatus List runs with the specified statuses
   * @param searchCommit List runs for the specified commit SHA
   * @param searchUser List runs for the specified user
   * @returns any List Runs Response
   * @throws ApiError
   */
  public listWorkspaceRuns(
workspaceId: string,
pageNumber?: number,
pageSize: number = 20,
filterOperation?: Array<'plan_only' | 'plan_and_apply' | 'refresh_only' | 'destroy' | 'empty_apply'>,
filterSource?: Array<'tfe-ui' | 'tfe-api' | 'tfe-configuration-version'>,
filterStatus?: Array<'pending' | 'fetching' | 'plan_queued' | 'planning' | 'planned' | 'cost_estimating' | 'cost_estimated' | 'policy_checking' | 'policy_override' | 'policy_soft_failed' | 'policy_checked' | 'confirmed' | 'post_plan_running' | 'post_plan_completed' | 'planned_and_finished' | 'apply_queued' | 'applying' | 'applied' | 'discarded' | 'errored' | 'canceled' | 'force_canceled'>,
searchCommit?: string,
searchUser?: string,
): CancelablePromise<{
data: Array<Run>;
meta?: {
pagination?: MetaPagination;
};
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/workspaces/{workspace_id}/runs',
      path: {
        'workspace_id': workspaceId,
      },
      query: {
        'page[number]': pageNumber,
        'page[size]': pageSize,
        'filter[operation]': filterOperation,
        'filter[source]': filterSource,
        'filter[status]': filterStatus,
        'search[commit]': searchCommit,
        'search[user]': searchUser,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

}
