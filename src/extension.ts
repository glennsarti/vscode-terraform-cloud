// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { RegisterTerrafromCloudAPIAuthenticationProvider } from './providers/authProvider';
import * as authCommands from './commands/authentication';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-terramform-cloud" is now active!');

  [
    vscode.commands.registerCommand('vscode-terramform-cloud.helloWorld', () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage('Hello World from vscode-terramform-cloud!');
    }),
    RegisterTerrafromCloudAPIAuthenticationProvider(context),
    authCommands.RegisterTerrafromCloudAPIAuthenticationLoginCommand(),
    authCommands.RegisterTerrafromCloudAPIAuthenticationReloginCommand()

    

  ].forEach(pushable => { context.subscriptions.push(pushable)});

	// context.subscriptions.push(vscode.authentication.registerAuthenticationProvider(
	// 	AzureDevOpsAuthenticationProvider.id,
	// 	'Azure Repos',
	// 	new AzureDevOpsAuthenticationProvider(context.secrets),
	// ));


  // // Example
  // disposable = vscode.commands.registerCommand('terraform-cloud.login', async () => {
  //   // Get our PAT session.
  //   const session = await vscode.authentication.getSession(TerrafromCloudAPIAuthenicationProviderId, [], { createIfNone: true });

  //   try {


  //     vscode.window.showInformationMessage(`Hello ${session.accessToken}`);
  //     // let tfc = new TerraformCloud(session.accessToken);

  //     // tfc.Account.getDetails().then( account => {
  //     //   vscode.window.showInformationMessage(`Hello ${account.attributes.username}`);
  //     // })


  //     // // Make a request to the Azure DevOps API. Keep in mind that this particular API only works with PAT's with
  //     // // 'all organizations' access.
  //     // const req = await fetch('https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=6.0', {
  //     //   headers: {
  //     //     authorization: `Basic ${Buffer.from(`:${session.accessToken}`).toString('base64')}`,
  //     //     'content-type': 'application/json',
  //     //   },
  //     // });
  //     // if (!req.ok) {
  //     //   throw new Error(req.statusText);
  //     // }
  //     // const res = await req.json() as { displayName: string };
      
  //   } catch (e: any) {
  //     if (e.message === 'Unauthorized') {
  //       vscode.window.showErrorMessage('Failed to get profile. You need to use a PAT that has access to all organizations. Please sign out and try again.');
  //     }
  //     throw e;
  //   }
  // });
  // context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
