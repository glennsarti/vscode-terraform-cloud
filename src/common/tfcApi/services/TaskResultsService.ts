/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskResult } from '../models/TaskResult';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class TaskResultsService {

  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Show a task result
   * @param taskResultId The id of the task result
   * @returns any Show Task Result Response
   * @throws ApiError
   */
  public showTaskResult(
taskResultId: string,
): CancelablePromise<{
data: TaskResult;
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/task-results/{task_result_id}',
      path: {
        'task_result_id': taskResultId,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

}
