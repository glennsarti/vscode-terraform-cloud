import * as vscode from 'vscode';
import { currentSession } from '../providers/authProvider';
import { TerraformCloud } from '@skorfmann/terraform-cloud'

async function tfcLogin(forceLogin:boolean) {
  const session = await currentSession(forceLogin);

  try {
    let tfc = new TerraformCloud(session.accessToken);

    const account = await tfc.Account.getDetails()
    vscode.window.showInformationMessage(`Logged into Terraform Cloud as ${account.attributes.username} (${account.attributes.email})`);   
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      vscode.window.showErrorMessage('Failed to get profile. You need to use a PAT that has access to all organizations. Please sign out and try again.');
    }
    throw e;
  }
};

export function RegisterTerrafromCloudAPIAuthenticationLoginCommand() {
  return vscode.commands.registerCommand('terraform-cloud.login', async() => { tfcLogin(false)});
}

export function RegisterTerrafromCloudAPIAuthenticationReloginCommand() {
  return vscode.commands.registerCommand('terraform-cloud.relogin', async() => { tfcLogin(true)});
}
