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
   * Lists all runs in a workspace
   * @param workspaceId The id of the workspace
   * @returns any List Runs Response
   * @throws ApiError
   */
  public listWorkspaceRuns(
workspaceId: string,
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

}
