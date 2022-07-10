/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetaPagination } from '../models/MetaPagination';
import type { Organization } from '../models/Organization';
import type { Workspace } from '../models/Workspace';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class OrganizationsService {

  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Show an organization
   * @param organizationName The name of the organization
   * @returns any Show Organization Response
   * @throws ApiError
   */
  public showOrganization(
organizationName: string,
): CancelablePromise<{
data: Organization;
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/organizations/{organization_name}',
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
   * Lists all organizations
   * @param pageNumber The page to request. Defaults to the first page
   * @param pageSize The page size to request. Defaults to the 20.
   * @returns any List Organizations Response
   * @throws ApiError
   */
  public listOrganizations(
pageNumber?: number,
pageSize: number = 20,
): CancelablePromise<{
data: Array<Organization>;
meta?: {
pagination?: MetaPagination;
};
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/organizations',
      query: {
        'page[number]': pageNumber,
        'page[size]': pageSize,
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
