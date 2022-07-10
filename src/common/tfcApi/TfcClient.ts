/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';


import { AppliesService } from './services/AppliesService';
import { CostEstimatesService } from './services/CostEstimatesService';
import { OrganizationsService } from './services/OrganizationsService';
import { PlansService } from './services/PlansService';
import { RunsService } from './services/RunsService';
import { TaskResultsService } from './services/TaskResultsService';
import { TaskStagesService } from './services/TaskStagesService';
import { UsersService } from './services/UsersService';
import { WorkspacesService } from './services/WorkspacesService';

export type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;

export class TfcClient {

  public readonly applies: AppliesService;
  public readonly costEstimates: CostEstimatesService;
  public readonly organizations: OrganizationsService;
  public readonly plans: PlansService;
  public readonly runs: RunsService;
  public readonly taskResults: TaskResultsService;
  public readonly taskStages: TaskStagesService;
  public readonly users: UsersService;
  public readonly workspaces: WorkspacesService;

  public readonly request: BaseHttpRequest;

  constructor(config: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor) {
    this.request = new HttpRequest({
      BASE: config?.BASE ?? 'https://app.terraform.io/api/v2',
      VERSION: config?.VERSION ?? '0.0.1',
      WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
      CREDENTIALS: config?.CREDENTIALS ?? 'include',
      TOKEN: config?.TOKEN,
      USERNAME: config?.USERNAME,
      PASSWORD: config?.PASSWORD,
      HEADERS: config?.HEADERS,
      ENCODE_PATH: config?.ENCODE_PATH,
    });

    this.applies = new AppliesService(this.request);
    this.costEstimates = new CostEstimatesService(this.request);
    this.organizations = new OrganizationsService(this.request);
    this.plans = new PlansService(this.request);
    this.runs = new RunsService(this.request);
    this.taskResults = new TaskResultsService(this.request);
    this.taskStages = new TaskStagesService(this.request);
    this.users = new UsersService(this.request);
    this.workspaces = new WorkspacesService(this.request);
  }
}
