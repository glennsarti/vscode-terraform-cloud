/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { RelationshipRun } from './RelationshipRun';
import type { RelationshipTaskResults } from './RelationshipTaskResults';
import type { TaskStageStatus } from './TaskStageStatus';

export type TaskStage = {
  id: string;
  type: string;
  attributes: {
'created-at'?: string;
stage: string;
status: TaskStageStatus;
'status-timestamps'?: {
'passed-at'?: string;
'running-at'?: string;
};
'updated-at'?: string;
};
  relationships?: {
run: RelationshipRun;
'task-results'?: RelationshipTaskResults;
};
  links?: {
self: string;
};
};
