import * as vscode from "vscode";
import { IConfiguration } from "../configuration";
import { TextEncoder } from "util";
import { LockingLruCache } from "../simpleCache";
import * as markdown from "../markdownHelper";

export const TFC_FILESYSTEM_SCHEME = "terraformcloud";

const CACHE_TTL_SECONDS = 10;

function nameOfUri(uri: vscode.Uri): string {
  const parts = uri.path.split("/");
  return parts[parts.length - 1];
}

function dirOfUri(uri: vscode.Uri): string {
  const parts = uri.path.split("/");
  return parts[1];
}

class FileStatItem implements vscode.FileStat {
  // For vscode.FileStat
  type: vscode.FileType;
  ctime: number;
  mtime: number;
  size: number;
  name: string;
  permissions?: vscode.FilePermission;

  uri: vscode.Uri;
  data: Uint8Array;

  constructor(uri: vscode.Uri) {
    this.type = vscode.FileType.File;
    this.ctime = Date.now();
    this.mtime = Date.now();
    this.size = -1; // 0;
    this.name = nameOfUri(uri);
    this.permissions = vscode.FilePermission.Readonly;

    this.uri = uri;
    this.data = new Uint8Array;
  }

  hasExpired(): boolean {
    return Date.now() - this.mtime > CACHE_TTL_SECONDS;
  }
}

export class TfcFileSystemProvider implements vscode.FileSystemProvider {
  private changeEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> =
    this.changeEmitter.event;

  private config: IConfiguration;
  private statCache: LockingLruCache<FileStatItem>;

  constructor(config: IConfiguration) {
    this.config = config;
    this.statCache = new LockingLruCache<FileStatItem>(20);
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    console.log(`BEGIN STAT ${uri}`);
    const xx = await this.getFileStatItem(uri).then((item) => {
      if (item === undefined) {
        throw vscode.FileSystemError.FileNotFound(uri);
      } else {
        return item;
      }
    });
    console.log(`END STAT ${uri}`);
    return xx;
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    throw vscode.FileSystemError.FileNotFound(uri);
  }

  createDirectory(uri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions(uri);
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    return await this.getFileStatItem(uri).then((item) => {
      if (item === undefined) {
        throw vscode.FileSystemError.FileNotFound(uri);
      } else {
        return item.data;
      }
    });
  }

  writeFile(
    uri: vscode.Uri,
    _content: Uint8Array,
    _options: { create: boolean; overwrite: boolean }
  ): void {
    throw vscode.FileSystemError.NoPermissions(uri);
  }

  rename(
    oldUri: vscode.Uri,
    _newUri: vscode.Uri,
    _options: { overwrite: boolean }
  ): void {
    throw vscode.FileSystemError.NoPermissions(oldUri);
  }

  delete(uri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions(uri);
  }

  watch(
    uri: vscode.Uri,
    _options: { readonly recursive: boolean; readonly excludes: readonly string[] }
  ): vscode.Disposable {
    console.log(`WATCH ${uri}`); // TODO!!!
    return new vscode.Disposable(() => {});
  }

  private async getFileStatItem(
    uri: vscode.Uri
  ): Promise<FileStatItem | undefined> {
    console.log(`BEGIN getFileStatItem ${uri}`);
    const key = uri.toString();
    return await this.statCache.getYield(key, async () => {
      console.log(`BEGIN getFileStatItem:getYield ${uri}`);
      let item = this.statCache.get(key);
      if (item !== undefined) {
        if (!item.hasExpired()) { return; }
        this.statCache.delete(key);
      } else {
        item = new FileStatItem(uri);
      }

      const data = await this.getFileItemData(uri);
      if (data === undefined) { return; }
      item.mtime = Date.now();
      item.data = data;
      item.size = data.length;
      this.statCache.put(key, item);
      console.log(`END getFileStatItem:getYield ${uri}`);
    });
  }

  private async getFileItemData(
    uri: vscode.Uri
  ): Promise<Uint8Array | undefined> {
    const dirName = dirOfUri(uri);
    const fileName = nameOfUri(uri);
    const encoder = new TextEncoder();

    switch (dirName) {
      case "runs":
        const content = await markdown.runIdAsMarkdown(
          this.config,
          fileName,
          true
        );
        if (content === undefined) {
          return undefined;
        } else {
          return encoder.encode(content);
        }
      default:
        return undefined;
    }
  }
}

export function registerTerraformCloudFileSystemProvider(
  provider: TfcFileSystemProvider
): vscode.Disposable[] {
  return [
    vscode.workspace.registerFileSystemProvider(
      TFC_FILESYSTEM_SCHEME,
      provider,
      { isCaseSensitive: false, isReadonly: true }
    ),
  ];
}
