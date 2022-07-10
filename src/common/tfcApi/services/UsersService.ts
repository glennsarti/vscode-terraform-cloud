/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { User } from '../models/User';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class UsersService {

  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Get Account Details
   * @returns any User Account Detail Response
   * @throws ApiError
   */
  public accountDetails(): CancelablePromise<{
data: User;
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/account/details',
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

}
