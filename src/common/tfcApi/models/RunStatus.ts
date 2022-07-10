/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export enum RunStatus {
  PENDING = 'pending',
  QUEUING = 'queuing',
  PLAN_QUEUED = 'plan_queued',
  PLANNING = 'planning',
  PLANNED = 'planned',
  CONFIRMED = 'confirmed',
  APPLY_QUEUED = 'apply_queued',
  APPLYING = 'applying',
  APPLIED = 'applied',
  DISCARDED = 'discarded',
  ERRORED = 'errored',
  CANCELED = 'canceled',
  COST_ESTIMATING = 'cost_estimating',
  COST_ESTIMATED = 'cost_estimated',
  POLICY_CHECKING = 'policy_checking',
  POLICY_OVERRIDE = 'policy_override',
  POLICY_SOFT_FAILED = 'policy_soft_failed',
  POLICY_CHECKED = 'policy_checked',
  PLANNED_AND_FINISHED = 'planned_and_finished',
  POST_PLAN_RUNNING = 'post_plan_running',
  POST_PLAN_COMPLETED = 'post_plan_completed',
  PRE_APPLY_RUNNING = 'pre_apply_running',
  PRE_APPLY_COMPLETED = 'pre_apply_completed',
  FETCHING = 'fetching',
  ASSESSING = 'assessing',
  ASSESSED = 'assessed',
}
