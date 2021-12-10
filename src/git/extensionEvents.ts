import * as vscode from 'vscode';
import * as gitext from '../api/git';
import { RepositoryList, RepositorySummary} from './types';

export class GitExtensionEventEmitter implements vscode.Disposable {
  private gitApi?: gitext.API;
  private gitExt?: gitext.GitExtension;
  private gitExtEnablementEvent?: vscode.Disposable;

  private gitRepositoriesChangedEmitter = new vscode.EventEmitter<RepositoryList>();
  onGitRepositoriesChanged = this.gitRepositoriesChangedEmitter.event;

  private async onDidChangeGitExtEnablement(enabled: boolean) {
    if (enabled) {
      if (!this.gitExt) { return; } // TODO: Should NEVER get here
      this.gitApi = this.gitExt.getAPI(1);
      await this.getRepositories(this.gitApi?.repositories ?? []);
    } else {
      this.gitRepositoriesChangedEmitter.fire([]);
    }
  }

  private async getRepositories(repositories: gitext.Repository[]) {
    await Promise.all(repositories.map(r => r.status())); // Load the repo list
    const list: RepositoryList = repositories.map(r => this.toSummary(r));
    this.gitRepositoriesChangedEmitter.fire(list);
  }

  private toSummary(repo: gitext.Repository): RepositorySummary {
    let result = new RepositorySummary;

    repo.state.remotes.forEach((remote) => {
      if (remote.pushUrl) {
        result.remotes.push(remote.pushUrl);
      }
    });
    // TODO: result.remotes could have duplicates.. Do we care?
    return result;
  }

  dispose(): void {
    this.gitApi = undefined;
    this.gitExtEnablementEvent?.dispose();
  }

  async init(): Promise<void> {
    try {
      this.gitExt = vscode.extensions.getExtension<gitext.GitExtension>('vscode.git')?.exports;
      if (!this.gitExt) {
        return;
      }
      this.gitExtEnablementEvent = this.gitExt.onDidChangeEnablement(this.onDidChangeGitExtEnablement, this);
      await this.onDidChangeGitExtEnablement(this.gitExt.enabled);
    } catch (error) {
      console.error(error);
    }
  }
}
