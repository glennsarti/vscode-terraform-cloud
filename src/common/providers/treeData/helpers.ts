import * as vscode from "vscode";
import * as markdown from "../../markdownHelper";
import { IConfiguration } from "../../configuration";

export function prettyString(input: any): string {
  if (input === undefined || input === null) { return "Unknown"; }
  let value = input.toString();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function prettyDuration(valueMilleseconds?: number): string {
  if (valueMilleseconds === undefined) { return "Unknown"; }
  if (valueMilleseconds < 60000) { return "< 1 minute"; }
  return Math.trunc(valueMilleseconds / 1000).toString() + " seconds";
}

export function newTreeItemLabel(label: string, highlights: [number, number][]): vscode.TreeItemLabel {
  return <any>{
    label: label,
    highlights: highlights
  };
}

export function createTextItem(
  label: string,
  icon: string,
  tooltip?: string | vscode.MarkdownString
): ProviderTreeItem {
  let item = new ProviderTreeItem(
    label,
    vscode.TreeItemCollapsibleState.None,
    "",
    null
  );
  if (icon !== "") {
    item.iconPath = new vscode.ThemeIcon(icon);
  }
  item.tooltip = tooltip;
  return item;
}

export class ProviderTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string | vscode.TreeItemLabel,
    public readonly collapsibleState:
      | vscode.TreeItemCollapsibleState
      | undefined,
    public readonly dependencyType: string,
    public readonly data: any,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
  }

  showMarkdownPreview(config: IConfiguration): void {
    switch (this.contextValue) {
      case "run":
        markdown.showTfcRunMarkdownPreview(config, this.data.id);
    }
  }
}
