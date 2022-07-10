/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type Plan = {
  id: string;
  type: string;
  attributes: {
'log-read-url'?: string;
'resource-additions'?: number;
'resource-changes'?: number;
'resource-destructions'?: number;
status: string;
'status-timestamps'?: {
'queued-at'?: string;
'pending-at'?: string;
'started-at'?: string;
'finished-at'?: string;
};
};
  links?: {
self: string;
'json-output'?: string;
};
};
