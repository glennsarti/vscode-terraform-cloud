import * as vscode from 'vscode';

export const DEFAULT_TERRAFORM_CLOUD_API_URL = "https://app.terraform.io";

export interface IConfiguration {
  apiUrl: string
  organization?: string
  workspace?: string
  watchWorkspaceOnStartup?: boolean
  detectWorkspaceOnStartup?: boolean

  apiURLAuthority?: string
}

interface ITerraformCloudWorkspaceSettings {
  apiUrl?: string
  organization?: string
  workspace?: string
  watchWorkspaceOnStartup?: boolean
  detectWorkspaceOnStartup?: boolean
}

const workspaceSectionName = "terraformCloud";

function defaultWorkspaceSettings(): ITerraformCloudWorkspaceSettings {
  return {
    apiUrl: DEFAULT_TERRAFORM_CLOUD_API_URL
  };
}

export function configurationFromVscode(): IConfiguration {
  const workspaceConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration();
  return new Configuration(workspaceConfig.get<ITerraformCloudWorkspaceSettings>(workspaceSectionName, defaultWorkspaceSettings()));
}

export class Configuration implements IConfiguration {
  public apiUrl: string;
  public organization?: string;
  public workspace?: string;
  public watchWorkspaceOnStartup?: boolean;
  public detectWorkspaceOnStartup?: boolean;
  public apiURLAuthority?: string;

  constructor(settings: ITerraformCloudWorkspaceSettings) {
    this.apiUrl = settings.apiUrl || DEFAULT_TERRAFORM_CLOUD_API_URL;
    this.organization = settings.organization;
    this.workspace = settings.workspace;
    this.watchWorkspaceOnStartup = settings.watchWorkspaceOnStartup;
    this.detectWorkspaceOnStartup = settings.detectWorkspaceOnStartup;

    try {
      const tempUrl = vscode.Uri.parse(this.apiUrl, true);
      this.apiURLAuthority = tempUrl.authority;
    } catch { }
  }
}
