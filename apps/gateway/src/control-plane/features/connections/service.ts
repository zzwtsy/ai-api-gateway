import type { ConnectionRepository, CreateConnectionInput } from "./contracts.js";
import { AppError } from "../../../core/errors/app-error.js";

export class ConnectionService {
  public constructor(private readonly repository: ConnectionRepository) {}

  public list() {
    return this.repository.list();
  }

  public async getById(id: string) {
    const item = await this.repository.getById(id);
    if (item === null) {
      throw new AppError("CONNECTION_NOT_FOUND");
    }
    return item;
  }

  public create(input: CreateConnectionInput) {
    return this.repository.create(input);
  }
}
