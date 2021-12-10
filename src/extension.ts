// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as config from "./configuration";
// import { GitExtensionEventEmitter } from "./git/extensionEvents";
import {
  registerTerraformCloudTaskProvider,
  TerraformCloudTaskProvider,
} from "./providers/taskProvider";
import {
  registerTerrafromCloudAPIAuthenticationProvider,
  TerrafromCloudAPIAuthenticationProvider,
} from "./providers/authProvider";
import { registerTerrafromCloudApiCommands } from "./providers/tfcApiCommandsProvider";
import {
  registerTerrafromCloudNotificationBarProvider,
  NotificationBarProvider,
} from "./providers/notificationBarProvider";
import {
  registerTerrafromCloudOrgSelectionProvider,
  TfcOrgSelectionProvider,
} from "./providers/tfcOrganizationSelectionProvider";
import {
  registerTerrafromCloudRunsTreeDataProvider,
  TfcRunProvider,
} from "./providers/treeData/tfcRunProvider";
import {
  registerTerrafromCloudWorkspacesTreeDataProvider,
  TfcWorkspaceProvider,
} from "./providers/treeData/tfcWorkspaceProvider";
import {
  registerTerraformCloudFileSystemProvider,
  TfcFileSystemProvider,
} from "./providers/tfcFileSystemProvider";
import { ITfcSession, TfcSession } from "./tfcSession";
import * as tfchelper from './tfcHelpers';

// let gitExtensionEvents: GitExtensionEventEmitter;

export function activate(context: vscode.ExtensionContext) {
  const extConfig: config.IConfiguration = config.configurationFromVscode();
  const session = new TfcSession(extConfig);

  const orgSelectionProvider = new TfcOrgSelectionProvider();
  const runsProvider = new TfcRunProvider(extConfig);
  const workspacesProvider = new TfcWorkspaceProvider(
    extConfig,
    session,
    runsProvider
  );
  const notificationProvider = new NotificationBarProvider(extConfig, session);
  const authProvider = new TerrafromCloudAPIAuthenticationProvider(
    context.secrets
  );
  const taskProvider = new TerraformCloudTaskProvider(extConfig, session);
  const tfcFsProvider = new TfcFileSystemProvider(extConfig);

  [
    registerTerrafromCloudAPIAuthenticationProvider(
      context,
      extConfig,
      authProvider
    ),
    registerTerrafromCloudWorkspacesTreeDataProvider(
      context,
      extConfig,
      session,
      workspacesProvider
    ),
    registerTerrafromCloudOrgSelectionProvider(
      context,
      extConfig,
      orgSelectionProvider,
      session
    ),
    registerTerrafromCloudRunsTreeDataProvider(
      context,
      extConfig,
      runsProvider
    ),
    registerTerrafromCloudNotificationBarProvider(notificationProvider),
    registerTerraformCloudTaskProvider(taskProvider),
    registerTerrafromCloudApiCommands(extConfig, taskProvider),
    registerTerraformCloudFileSystemProvider(tfcFsProvider),
  ]
    .flat()
    .forEach((item) => {
      context.subscriptions.push(item);
    });

  // session.init();

  // TODO make these non-blocking

  postActivate(extConfig, session, workspacesProvider, runsProvider);



  // TODO: initial Org Id.
    //session.watchingWorkspaceId = "ws-JAso7iHxDAnLUWCx";

    //markdown.showTfcRunMarkdownPreview(extConfig, 'run-TQ9KtvTf1gDawcNM');
    //markdown.showTfcRunMarkdownPreview(extConfig, 'run-cuGeiBQPt1MpmJXv');
  // gitExtensionEvents = new GitExtensionEventEmitter();
  // gitExtensionEvents.init();
  // gitExtensionEvents.onGitRepositoriesChanged(async (e: RepositoryList) => {
  //   // TODO: Convert to a promise-y kind of thing
  //   const workspace = await tfchelper.findWorkspaceFromRepositoryList(e);
  //   if (workspace === undefined) { return; }
  //   const orgId = workspace.relationships?.organization?.data?.id;
  //   if (orgId === undefined) { return; }
  //   notificationProvider.startWatch(orgId, workspace.id, workspace.attributes.name);
  // });
}

// this method is called when your extension is deactivated
export function deactivate() {}

async function postActivate(
  extConfig: config.IConfiguration,
  session: ITfcSession,
  wsProv: TfcWorkspaceProvider,
  runsProv: TfcRunProvider,
): Promise<void> {
  if (extConfig.organization !== undefined) {
    if (extConfig.workspace !== undefined) {
      const client = await tfchelper.createClient(extConfig);

      const workspace = await tfchelper.getWorkspaceByName(client, extConfig.organization, extConfig.workspace);
      wsProv.initProvider(extConfig.organization, workspace?.id);
      runsProv.initProvider(workspace?.id);

      if (extConfig.watchWorkspaceOnStartup) {
        session.watchWorkspaceId(workspace?.id);
      }
    } else {
      wsProv.initProvider(extConfig.organization);
    }
  }
}
