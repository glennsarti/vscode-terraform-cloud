/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CostEstimateStatus } from './CostEstimateStatus';

export type CostEstimate = {
  id: string;
  type: string;
  attributes: {
'delta-monthly-cost'?: string;
'matched-resources-count'?: number;
'prior-monthly-cost'?: string;
'proposed-monthly-cost'?: string;
'resources-count'?: number;
status?: CostEstimateStatus;
'unmatched-resources-count'?: number;
};
  links?: {
self?: string;
};
};
