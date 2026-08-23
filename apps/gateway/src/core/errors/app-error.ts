import type { ErrorCode } from "./error-registry.js";

export class AppError extends Error {
  public constructor(
    public readonly code: ErrorCode,
    public readonly details?: ReadonlyArray<{ path: string; message: string }>,
    options?: ErrorOptions
  ) {
    super(code, options);
    this.name = "AppError";
  }
}
