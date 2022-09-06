/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export enum PolicyCheckStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PASSED = 'passed',
  SOFT_FAILED = 'soft_failed',
  HARD_FAILED = 'hard_failed',
  OVERRIDDEN = 'overridden',
  ERRORED = 'errored',
  CANCELED = 'canceled',
}
