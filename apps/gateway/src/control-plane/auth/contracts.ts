export interface ControlUser {
  readonly id: string;
  readonly email: string;
  readonly source: "better-auth" | "development-token";
}

export interface ControlSessionUser {
  readonly id: string;
  readonly email: string;
}

export interface ControlAuth {
  handler: (request: Request) => Promise<Response>;
  getSession: (headers: Headers) => Promise<ControlSessionUser | null>;
  signUpEmail: (input: {
    readonly name: string;
    readonly email: string;
    readonly password: string;
  }) => Promise<void>;
}
