/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { RelationshipOauthTokens } from './RelationshipOauthTokens';

export type Organization = {
  id: string;
  type: string;
  attributes: {
'external-id': string;
name: string;
email?: string;
};
  relationships?: {
'oauth-tokens'?: RelationshipOauthTokens;
};
  links?: {
self?: string;
};
};
