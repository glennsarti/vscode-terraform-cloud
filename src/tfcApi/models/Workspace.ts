/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { RelationshipOrganization } from './RelationshipOrganization';
import type { RelationshipRun } from './RelationshipRun';
import type { RelationshipTaskStages } from './RelationshipTaskStages';
import type { WorkspaceExecutionMode } from './WorkspaceExecutionMode';

export type Workspace = {
  id: string;
  type: string;
  attributes: {
'apply-duration-average'?: number;
'auto-apply'?: boolean;
description?: string;
'execution-mode': WorkspaceExecutionMode;
name: string;
locked?: boolean;
permissions: {
'can-create-state-versions': boolean;
'can-destroy': boolean;
'can-force-unlock': boolean;
'can-lock': boolean;
'can-manage-run-tasks': boolean;
'can-manage-tags': boolean;
'can-queue-apply': boolean;
'can-queue-destroy': boolean;
'can-queue-run': boolean;
'can-read-settings': boolean;
'can-read-state-versions': boolean;
'can-read-variable': boolean;
'can-unlock': boolean;
'can-update': boolean;
'can-update-variable': boolean;
};
'plan-duration-average'?: number;
'run-failures'?: number;
'workspace-kpis-runs-count'?: number;
};
  relationships?: {
organization?: RelationshipOrganization;
'current-run'?: RelationshipRun;
'latest-run'?: RelationshipRun;
'task-stages'?: RelationshipTaskStages;
};
  links?: {
self: string;
};
};
