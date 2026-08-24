export interface RuntimeResourceCloseOperations {
  readonly stopBackgroundTasks: () => Promise<void>;
  readonly closeTransport: () => Promise<void>;
  readonly closeStorage: () => Promise<void>;
}

export async function closeRuntimeResources(operations: RuntimeResourceCloseOperations): Promise<void> {
  await operations.stopBackgroundTasks();
  await operations.closeTransport();
  await operations.closeStorage();
}
