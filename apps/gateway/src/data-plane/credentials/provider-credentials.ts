export interface ProviderCredential {
  readonly id: string;
  readonly secret: string;
}

export interface ProviderCredentialResolver {
  resolve: (id: string) => Promise<ProviderCredential | null>;
}

export class StaticProviderCredentialResolver implements ProviderCredentialResolver {
  readonly #credentials = new Map<string, ProviderCredential>();

  public constructor(credentials: readonly ProviderCredential[]) {
    for (const credential of credentials) {
      this.#credentials.set(credential.id, credential);
    }
  }

  public async resolve(id: string): Promise<ProviderCredential | null> {
    return this.#credentials.get(id) ?? null;
  }
}
