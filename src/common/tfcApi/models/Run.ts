/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { RelationshipApply } from './RelationshipApply';
import type { RelationshipCostEstimate } from './RelationshipCostEstimate';
import type { RelationshipPlan } from './RelationshipPlan';
import type { RelationshipPolicyChecks } from './RelationshipPolicyChecks';
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
'cost-estimated-at'?: string;
'cost-estimating-at'?: string;
'plan-queueable-at'?: string;
'plan-queued-at'?: string;
'planned-and-finished-at'?: string;
'planned-at'?: string;
'planning-at'?: string;
'policy-checked-at'?: string;
'post-plan-completed-at'?: string;
'pre-apply-completed-at'?: string;
'pre-plan-completed-at'?: string;
'queuing-at'?: string;
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
'policy-checks'?: RelationshipPolicyChecks;
};
  links?: {
self: string;
};
};
