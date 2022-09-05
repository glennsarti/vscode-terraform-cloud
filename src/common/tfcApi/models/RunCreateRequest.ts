/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type RunCreateRequest = {
  data: {
attributes?: {
'allow-empty-apply'?: boolean;
'auto-apply'?: boolean;
message?: string;
'plan-only'?: boolean;
};
relationships: {
workspace: {
data: {
id: string;
type?: string;
};
};
'configuration-version'?: {
data: {
id: string;
type?: string;
};
};
};
};
};
