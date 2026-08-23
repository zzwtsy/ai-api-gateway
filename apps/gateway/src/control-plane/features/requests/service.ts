import type { RequestStore } from "../../../core/requests/contracts.js";
import { AppError } from "../../../core/errors/app-error.js";

export class RequestQueryService {
  public constructor(private readonly store: RequestStore) {}

  public list(limit: number) {
    return this.store.listRequests(limit);
  }

  public async getById(id: string) {
    const request = await this.store.getRequest(id);
    if (request === null) {
      throw new AppError("REQUEST_NOT_FOUND");
    }
    return request;
  }
}
