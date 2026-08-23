export interface ShutdownOperations {
  stopAccepting: () => Promise<void>;
  closeResources: () => Promise<void>;
}

/**
 * Own the one-way process shutdown transaction. Concurrent signals share the
 * same promise; completion means the server stopped accepting and every owned
 * runtime resource reached quiescence.
 */
export class ShutdownController {
  #shutdown: Promise<void> | null = null;

  public constructor(private readonly operations: ShutdownOperations) {}

  public shutdown(): Promise<void> {
    this.#shutdown ??= this.#run();
    return this.#shutdown;
  }

  async #run(): Promise<void> {
    await this.operations.stopAccepting();
    await this.operations.closeResources();
  }
}
