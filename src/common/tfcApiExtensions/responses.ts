import * as tfc from "../tfcApi";

abstract class BaseResponse<T> {
  constructor(public data: T, public included?: tfc.IncludedResources) {}
}

export class RunResponse extends BaseResponse<tfc.Run> {}

export class TaskStagesResponse extends BaseResponse<tfc.TaskStage[]> {}
