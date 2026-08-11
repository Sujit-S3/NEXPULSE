export class NexpulseError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: Record<string, string[]>;

  constructor(input: {
    message: string;
    status: number;
    code: string;
    requestId?: string;
    details?: Record<string, string[]>;
  }) {
    super(input.message);
    this.name = "NexpulseError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.details = input.details;
  }
}
