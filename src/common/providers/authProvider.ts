import * as vscode from 'vscode';
//import { TerraformCloud } from '../tfc/api';
import { IConfiguration } from '../configuration';
import * as tfcapi from '../tfcApi';
import { createTfcClient } from '../tfcApiExtensions/TfcClient';

export const TERRAFROM_CLOUD_API_AUTHENICATION_PROVIDER_ID = 'TerraformCloudAPIToken';
const TOKEN_PREFIX = 'TerraformCloudAPISecretToken';

class TerraformCloudSession implements vscode.AuthenticationSession {
  readonly account: vscode.AuthenticationSessionAccountInformation;
  readonly id: string;
  readonly scopes: string[];
  readonly accessToken: string;

  constructor(accessToken: string, rootApiUrl: string) {
    this.account = { id: TERRAFROM_CLOUD_API_AUTHENICATION_PROVIDER_ID, label: 'Terrafrom Cloud Token' };
    this.accessToken = accessToken;
    this.id = rootApiUrl;
    this.scopes = [rootApiUrl];
  }
}

export async function currentSession(forceLogin: boolean, config: IConfiguration): Promise<vscode.AuthenticationSession> {
  const scopes: string[] = [config.apiUrl];
  if (forceLogin) {
    await vscode.authentication.getSession(TERRAFROM_CLOUD_API_AUTHENICATION_PROVIDER_ID, scopes, { forceNewSession: true });
  }
  return await vscode.authentication.getSession(TERRAFROM_CLOUD_API_AUTHENICATION_PROVIDER_ID, scopes, { createIfNone: true });
}

export class TerrafromCloudAPIAuthenticationProvider implements vscode.AuthenticationProvider, vscode.Disposable {
  static id = TERRAFROM_CLOUD_API_AUTHENICATION_PROVIDER_ID;
  private initializedDisposable: vscode.Disposable | undefined;

  private _onDidChangeSessions = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
  get onDidChangeSessions(): vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent> {
    return this._onDidChangeSessions.event;
  }

  private tokenStorage: TFCTokenSecretStorge;

  constructor(secretStorage: vscode.SecretStorage) {
    this.tokenStorage = new TFCTokenSecretStorge(secretStorage);
  }

  dispose(): void {
    this.initializedDisposable?.dispose();
  }

  private ensureInitialized(): void {
    if (this.initializedDisposable === undefined) {
      void this.tokenStorage.getKeyList();

      this.initializedDisposable = vscode.Disposable.from(
        // This onDidChange event happens when the secret storage changes in _any window_ since
        // secrets are shared across all open windows.
        this.tokenStorage.onDidChange(e => {
          if (e.key.toString().startsWith(TOKEN_PREFIX)) {
            void this.checkForUpdates();
          }
        }),
        // This fires when the user initiates a "silent" auth flow via the Accounts menu.
        vscode.authentication.onDidChangeSessions(e => {
          if (e.provider.id === TerrafromCloudAPIAuthenticationProvider.id) {
            void this.checkForUpdates();
          }
        }),
      );
    }
  }

  // This is a crucial function that handles whether or not the token has changed in
  // a different window of VS Code and sends the necessary event if it has.
  private async checkForUpdates(): Promise<void> {
    // TODO : this is all broke
//     const added: vscode.AuthenticationSession[] = [];
//     const removed: vscode.AuthenticationSession[] = [];
//     const changed: vscode.AuthenticationSession[] = [];

//     const previousToken = await this.currentToken;
//     const session = (await this.getSessions())[0];

//     if (session?.accessToken && !previousToken) {
//       added.push(session);
//     } else if (!session?.accessToken && previousToken) {
//       removed.push(session);
//     } else if (session?.accessToken !== previousToken) {
//       changed.push(session);
//     } else {
//       return;
//     }

// //    void this.cacheTokenFromStorage();
//     this._onDidChangeSessions.fire({ added: added, removed: removed, changed: changed });
  }

  // private cacheTokenFromStorage() {
  //   this.currentToken = this.secretStorage.get(TerrafromCloudAPIAuthenticationProvider.secretKey) as Promise<string | undefined>;
  //   return this.currentToken;
  // }

  // This function is called first when `vscode.authentication.getSessions` is called.
  async getSessions(scopes?: string[]): Promise<readonly vscode.AuthenticationSession[]> {
    // TODO THIS IS BROKE
    this.ensureInitialized();

    const list: vscode.AuthenticationSession[] = [];
    await this.tokenStorage.forEachToken((url, token) => {
      if (scopes === undefined || scopes.includes(url)) {
        list.push(new TerraformCloudSession(token, url));
      }
    });

    return list;
  }

  // This function is called after `this.getSessions` is called and only when:
  // - `this.getSessions` returns nothing but `createIfNone` was set to `true` in `vscode.authentication.getSessions`
  // - `vscode.authentication.getSessions` was called with `forceNewSession: true`
  // - The end user initiates the "silent" auth flow via the Accounts menu
  async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
    this.ensureInitialized();

    let token: string | undefined;

    do {
      // Prompt for the PAT.
      token = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: 'API Key',
        prompt: 'Enter a Terraform Cloud API Key',
        password: true,
        title: `Terraform Cloud - ${scopes[0]}`
      });

      // Note: this example doesn't do any validation of the token beyond making sure it's not empty.
      if (!token) {
        throw new Error('API Key is required');
      }

      try {
        const client = createTfcClient(token, scopes[0]);
        const account = await client.users.accountDetails();
        vscode.window.showInformationMessage(`Logged into Terraform Cloud as ${account.data?.attributes.username} (${account.data?.attributes.email})`);
      } catch (e: any) {
        if (e.message === 'Unauthorized') {
          vscode.window.showErrorMessage('Failed to get profile. You need to use a PAT that has access to all organizations. Please sign out and try again.');
        }
        token = undefined;
      }
    } while (token === undefined);

    // TODO: Validate with a call

    // Don't set `currentToken` here, since we want to fire the proper events in the `checkForUpdates` call
    await this.tokenStorage.set(scopes[0], token);
    console.log('Successfully logged in to Terraform Cloud');

    return new TerraformCloudSession(token, scopes[0]);
  }

  // This function is called when the end user signs out of the account.
  async removeSession(sessionId: string): Promise<void> {
    await this.tokenStorage.delete(sessionId);
  }
}

class TFCTokenSecretStorge {
  onDidChange: vscode.Event<vscode.SecretStorageChangeEvent>;
  private storage: vscode.SecretStorage;

  constructor(storage: vscode.SecretStorage) {
    this.storage = storage;
    this.onDidChange = this.storage.onDidChange;
  }

  private urlListKey(): string {
    return TOKEN_PREFIX;
  }

  private urlKey(apiUrl:string): string {
    return TOKEN_PREFIX + apiUrl;
  }

  public async getKeyList(): Promise<string[]> {
    const list = await this.storage.get(this.urlListKey());
    if (list === undefined) {
      await this.storage.store(this.urlListKey(), "");
      return [];
    }
    if (list.length === 0) { return []; }
    return list.split("\t");
  }

  private async exists(apiUrl: string): Promise<boolean> {
    const list = await this.getKeyList();
    return list.includes(apiUrl);
  }

  private async createKeyIfNotExit(apiUrl: string): Promise<void> {
    const list = await this.getKeyList();
    if (!list.includes(apiUrl)) {
      list.push(apiUrl);
      await this.storage.store(this.urlListKey(), list.join("\t"));
    }
  }

  private async deleteKey(apiUrl: string): Promise<void> {
    const list = await this.getKeyList();
    const index: number = list.indexOf(apiUrl, 0);
    if (index > -1) {
      list.splice(index, 1);
      await this.storage.store(this.urlListKey(), list.join("\t"));
    }
  }

  public async get(apiUrl: string): Promise<string | undefined> {
    if (await this.exists(apiUrl)) {
      return this.storage.get(this.urlKey(apiUrl));
    } else {
      return undefined;
    }
  }

  public async forEachToken(eachFunc: (url: string, token: string) => void): Promise<void> {
    const keys = await this.getKeyList();

    for (let index = 0; index < keys.length; index++) {
      const token = await this.storage.get(this.urlKey(keys[index]));
      if (token !== undefined) { eachFunc(keys[index], token); };
    }
  };

  public async set(apiUrl: string, token: string): Promise<void> {
    await this.createKeyIfNotExit(apiUrl);
    await this.storage.store(this.urlKey(apiUrl), token);
  }

  public async delete(apiUrl: string): Promise<void> {
    if (apiUrl === "") { return; }
    await this.deleteKey(apiUrl);
    await this.storage.delete(this.urlKey(apiUrl));
  }
}

async function tfcLogin(forceLogin: boolean, config: IConfiguration) {
  const session = await currentSession(forceLogin, config);

  try {
    const client = createTfcClient(session.accessToken, session.scopes[0]);

    const account = await client.users.accountDetails();
    // TODO Check for account.data === undefined
    vscode.window.showInformationMessage(`Logged into Terraform Cloud as ${account.data?.attributes.username} (${account.data?.attributes.email})`);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      vscode.window.showErrorMessage('Failed to get profile. You need to use a PAT that has access to all organizations. Please sign out and try again.');
    }
    throw e;
  }
};

async function tfcLogout(provider: TerrafromCloudAPIAuthenticationProvider, sessionId: string) {
  await provider.removeSession(sessionId);
  vscode.window.showInformationMessage(`Logged out of Terraform Cloud`);
};

export function registerTerrafromCloudAPIAuthenticationProvider(
  _context: vscode.ExtensionContext,
  config: IConfiguration,
  provider: TerrafromCloudAPIAuthenticationProvider
): vscode.Disposable[] {
  return [
    vscode.authentication.registerAuthenticationProvider(TERRAFROM_CLOUD_API_AUTHENICATION_PROVIDER_ID, 'Terraform Cloud', provider, { supportsMultipleAccounts: true }),
    vscode.commands.registerCommand('terraform-cloud.login', async () => { tfcLogin(false, config); }),
    vscode.commands.registerCommand('terraform-cloud.logout', async () => { tfcLogout(provider, config.apiUrl); }),
    vscode.commands.registerCommand('terraform-cloud.relogin', async () => { tfcLogin(true, config); })
  ];
}
