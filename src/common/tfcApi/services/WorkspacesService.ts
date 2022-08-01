/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetaPagination } from '../models/MetaPagination';
import type { Run } from '../models/Run';
import type { Workspace } from '../models/Workspace';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class WorkspacesService {

  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Lists all workspaces in an organization
   * @param organizationName The name of the organization
   * @returns any List Workspaces Response
   * @throws ApiError
   */
  public listWorkspaces(
organizationName: string,
): CancelablePromise<{
data: Array<Workspace>;
meta?: {
pagination?: MetaPagination;
};
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/organizations/{organization_name}/workspaces',
      path: {
        'organization_name': organizationName,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

  /**
   * Show a workspace in an organization
   * @param organizationName The name of the organization
   * @param workspaceName The name of the workspace to show
   * @returns any Show Workspace Response
   * @throws ApiError
   */
  public showWorkspaceByName(
organizationName: string,
workspaceName: string,
): CancelablePromise<{
data: Workspace;
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/organizations/{organization_name}/workspaces/{workspace_name}',
      path: {
        'organization_name': organizationName,
        'workspace_name': workspaceName,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

  /**
   * Show a workspace
   * @param workspaceId The id of the workspace
   * @returns any Show Workspace Response
   * @throws ApiError
   */
  public showWorkspace(
workspaceId: string,
): CancelablePromise<{
data: Workspace;
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/workspaces/{workspace_id}',
      path: {
        'workspace_id': workspaceId,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

  /**
   * Lock a workspace
   * @param workspaceId The id of the workspace
   * @param requestBody Workspace Lock action comment
   * @returns any Show Workspace Response
   * @throws ApiError
   */
  public lockWorkspace(
workspaceId: string,
requestBody?: {
comment?: string;
},
): CancelablePromise<{
data: Workspace;
}> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/workspaces/{workspace_id}/actions/lock',
      path: {
        'workspace_id': workspaceId,
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
   * Unlock a workspace
   * @param workspaceId The id of the workspace
   * @param requestBody A request which cannot contain any information
   * @returns any Show Workspace Response
   * @throws ApiError
   */
  public unlockWorkspace(
workspaceId: string,
requestBody?: any,
): CancelablePromise<{
data: Workspace;
}> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/workspaces/{workspace_id}/actions/unlock',
      path: {
        'workspace_id': workspaceId,
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
