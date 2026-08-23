import { assertObservationSummary, assertObserverConfiguration } from "./invariant.js";

export interface ObservationSummary {
  readonly status: "complete" | "incomplete";
  readonly observedBytes: number;
  readonly firstByteAt: Date | null;
}

export type ChunkObserver = (chunk: Uint8Array) => void | Promise<void>;

export class BoundedByteObserver {
  readonly #queue: Uint8Array[] = [];
  #queuedBytes = 0;
  #inFlightBytes = 0;
  #observedBytes = 0;
  #firstByteAt: Date | null = null;
  #incomplete = false;
  #drainPromise: Promise<void> | null = null;

  public constructor(
    private readonly maxBufferBytes: number,
    private readonly observe: ChunkObserver = () => undefined,
  ) {
    assertObserverConfiguration(maxBufferBytes);
  }

  public tryWrite(chunk: Uint8Array, receivedAt: Date): boolean {
    if (this.#firstByteAt === null) {
      this.#firstByteAt = receivedAt;
    }
    if (this.#incomplete) {
      return false;
    }
    if (this.#queuedBytes + chunk.byteLength > this.maxBufferBytes) {
      this.#markIncomplete();
      return false;
    }

    const copy = chunk.slice();
    this.#queue.push(copy);
    this.#queuedBytes += copy.byteLength;
    this.#observedBytes += copy.byteLength;
    this.#startDrain();
    return true;
  }

  public async finish(): Promise<ObservationSummary> {
    await this.#drainPromise;
    const summary: ObservationSummary = {
      status: this.#incomplete ? "incomplete" : "complete",
      observedBytes: this.#observedBytes,
      firstByteAt: this.#firstByteAt,
    };
    assertObservationSummary(summary);
    return summary;
  }

  #startDrain(): void {
    if (this.#drainPromise !== null) {
      return;
    }
    this.#drainPromise = this.#drain().finally(() => {
      this.#drainPromise = null;
      if (this.#queue.length > 0 && !this.#incomplete) {
        this.#startDrain();
      }
    });
  }

  async #drain(): Promise<void> {
    while (this.#queue.length > 0 && !this.#incomplete) {
      const chunk = this.#queue.shift();
      if (chunk === undefined) {
        return;
      }
      this.#inFlightBytes = chunk.byteLength;
      try {
        await this.observe(chunk);
      } catch {
        this.#markIncomplete();
      } finally {
        this.#queuedBytes -= this.#inFlightBytes;
        this.#inFlightBytes = 0;
      }
      await Promise.resolve();
    }
  }

  #markIncomplete(): void {
    this.#incomplete = true;
    this.#queue.length = 0;
    this.#queuedBytes = this.#inFlightBytes;
  }
}
