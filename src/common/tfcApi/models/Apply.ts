/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type Apply = {
  id: string;
  type: string;
  attributes: {
'execution-details'?: {
mode?: string;
};
'log-read-url'?: string;
'resource-additions'?: number;
'resource-changes'?: number;
'resource-destructions'?: number;
status: string;
'status-timestamps'?: {
'queued-at'?: string;
'started-at'?: string;
'finished-at'?: string;
};
};
  links?: {
self: string;
};
};
