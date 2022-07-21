import * as vscode from "vscode";
import { registerTerrafromCloudAPIAuthenticationProvider } from "./providers/authProvider";

export const DEFAULT_TERRAFORM_CLOUD_API_URL = "https://app.terraform.io";

export class WorkspaceDefinitions {
  private list: Map<string, Map<string, WorkspaceDefinition>> = new Map < string, Map<string, WorkspaceDefinition>>();

  public add(definition: WorkspaceDefinition): boolean {
    if (!definition.valid()) {
      return false;
    }
    if (!this.list.has(definition.organizationName)) {
      this.list.set(definition.organizationName, new Map<string, WorkspaceDefinition>());
    }

    if (!this.list.get(definition.organizationName)?.has(definition.workspaceName)) {
      this.list.get(definition.organizationName)?.set(definition.workspaceName, definition);
      return true;
    }
    return false;
  }

  public organizationNames(): string[] {
    const result: string[] = [];
    for (const item of this.list.keys()) {
      result.push(item);
    }
    return result;
  }

  public workspaceNames(organizationId: string): string[] {
    const result: string[] = [];
    const workspaces = this.list.get(organizationId);
    if (workspaces === undefined) { return result; }
    for (const item of workspaces.keys()) {
      result.push(item);
    }
    return result;
  }

  public clone(): WorkspaceDefinitions {
    const replica = new WorkspaceDefinitions();

    this.list.forEach((workspaces) => {
      workspaces.forEach((defn) => {
        replica.add(defn.clone());
      });
    });

    return replica;
  }
}

export class WorkspaceDefinition {
  public workspaceName: string = "";
  public organizationName: string = "";

  constructor(value?: string) {
    if (value) {
      const parts = value.split("/", 2);
      if (parts.length === 2) {
        this.organizationName = parts[0];
        this.workspaceName = parts[1];
      }
    }
  }

  with(organizationName: string, workspaceName: string): WorkspaceDefinition {
    this.organizationName = organizationName;
    this.workspaceName = workspaceName;
    return this;
  }

  clone(): WorkspaceDefinition {
    return new WorkspaceDefinition().with(this.organizationName, this.workspaceName);
  }

  valid(): boolean {
    return this.workspaceName !== "" && this.organizationName !== "";
  }
}

export interface IConfiguration {
  apiUrl: string;
  workspaces: WorkspaceDefinitions;
  defaultWorkspace?: WorkspaceDefinition;
  watchWorkspaceOnStartup: boolean;
  detectWorkspaceOnStartup: boolean;
  apiURLAuthority?: string;
}

interface ITerraformCloudWorkspaceSettings {
  apiUrl?: string;
  workspaces?: string[];
  watchWorkspaceOnStartup?: boolean;
  detectWorkspaceOnStartup?: boolean;
}

const workspaceSectionName = "terraformCloud";

function defaultWorkspaceSettings(): ITerraformCloudWorkspaceSettings {
  return {
    apiUrl: DEFAULT_TERRAFORM_CLOUD_API_URL,
  };
}

export function configurationFromVscode(): IConfiguration {
  const workspaceConfig: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();
  return new Configuration(
    workspaceConfig.get<ITerraformCloudWorkspaceSettings>(
      workspaceSectionName,
      defaultWorkspaceSettings()
    )
  );
}

export class Configuration implements IConfiguration {
  public apiUrl: string;
  public workspaces: WorkspaceDefinitions;
  public watchWorkspaceOnStartup: boolean;
  public detectWorkspaceOnStartup: boolean;
  public apiURLAuthority?: string;
  public defaultWorkspace?: WorkspaceDefinition;

  constructor(settings: ITerraformCloudWorkspaceSettings) {
    this.apiUrl = settings.apiUrl || DEFAULT_TERRAFORM_CLOUD_API_URL;
    this.workspaces = new WorkspaceDefinitions();
    this.watchWorkspaceOnStartup = settings.watchWorkspaceOnStartup || false;
    this.detectWorkspaceOnStartup = settings.detectWorkspaceOnStartup || false;

    if (settings.workspaces !== undefined) {
      for (let index = 0; index < settings.workspaces.length; index++) {
        if (index === 0) {
          const wsd = new WorkspaceDefinition(settings.workspaces[index]);
          if (wsd.valid()) {
            this.defaultWorkspace = wsd;
          }
        }
        this.workspaces.add(new WorkspaceDefinition(settings.workspaces[index]));
      }
    }

    try {
      const tempUrl = vscode.Uri.parse(this.apiUrl, true);
      this.apiURLAuthority = tempUrl.authority;
    } catch {}
  }
}
