/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { PolicyCheckStatus } from './PolicyCheckStatus';
import type { RelationshipRun } from './RelationshipRun';

export type PolicyCheck = {
  id: string;
  type: string;
  attributes: {
actions?: {
'is-overridable'?: boolean;
};
'created-at'?: string;
permissions?: {
'can-override': boolean;
};
result: {
result?: boolean;
passed?: number;
'total-failed'?: number;
'hard-failed'?: number;
'soft-failed'?: number;
'advisory-failed'?: number;
'duration-ms'?: number;
};
scope: PolicyCheck.scope;
status: PolicyCheckStatus;
'status-timestamps'?: {
canceled_at?: string;
errored_at?: string;
'hard-failed_at'?: string;
overridden_at?: string;
passed_at?: string;
pending_at?: string;
queued_at?: string;
'soft-failed_at'?: string;
};
'updated-at'?: string;
};
  relationships?: {
run: RelationshipRun;
};
  links?: {
output?: string;
};
};

export namespace PolicyCheck {

  export enum scope {
    ORGANIZATION = 'organization',
    WORKSPACE = 'workspace',
  }


}
