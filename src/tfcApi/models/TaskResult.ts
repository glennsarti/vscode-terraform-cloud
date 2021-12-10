/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { RelationshipTaskStage } from './RelationshipTaskStage';
import type { TaskResultStatus } from './TaskResultStatus';

export type TaskResult = {
  id: string;
  type: string;
  attributes: {
'created-at'?: string;
message?: string;
stage: string;
status: TaskResultStatus;
'status-timestamps'?: {
'passed-at'?: string;
'running-at'?: string;
};
'task-id'?: string;
'task-name'?: string;
url?: string;
'updated-at'?: string;
};
  relationships?: {
'task-stage': RelationshipTaskStage;
};
  links?: {
self: string;
};
};
