/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { RelationshipApply } from './RelationshipApply';
import type { RelationshipCostEstimate } from './RelationshipCostEstimate';
import type { RelationshipPlan } from './RelationshipPlan';
import type { RelationshipTaskStages } from './RelationshipTaskStages';
import type { RelationshipWorkspace } from './RelationshipWorkspace';
import type { RunStatus } from './RunStatus';

export type Run = {
  id: string;
  type: string;
  attributes: {
actions?: {
'is-cancelable'?: boolean;
'is-confirmable'?: boolean;
'is-discardable'?: boolean;
'is-force-cancelable'?: boolean;
};
'auto-apply'?: boolean;
'allow-empty-apply'?: boolean;
'created-at'?: string;
'has-changes'?: boolean;
'is-destroy'?: boolean;
message?: string;
permissions: {
'can-apply': boolean;
'can-cancel': boolean;
'can-comment': boolean;
'can-discard': boolean;
'can-force-execute': boolean;
'can-force-cancel': boolean;
'can-override-policy-check': boolean;
};
'plan-only'?: boolean;
refresh?: boolean;
'refresh-only'?: boolean;
'status-timestamps'?: {
'applied-at'?: string;
'plan-queueable-at'?: string;
'planned-at'?: string;
'post-plan-completed-at'?: string;
'pre-plan-completed-at'?: string;
'pre-apply-completed-at'?: string;
};
source?: string;
status: RunStatus;
'terraform-version'?: string;
};
  relationships?: {
workspace?: RelationshipWorkspace;
apply?: RelationshipApply;
plan?: RelationshipPlan;
'task-stages'?: RelationshipTaskStages;
'cost-estimate'?: RelationshipCostEstimate;
};
  links?: {
self: string;
};
};
