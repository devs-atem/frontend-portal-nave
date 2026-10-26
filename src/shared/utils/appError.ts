type Variant = "error" | "warning" | "success";

export default class AppError extends Error {
  public readonly variant: Variant;
  public readonly status?: number;
  public readonly details?: unknown[];

  constructor(
    message: string,
    variant: Variant = "error",
    name?: string,
    status?: number,
    details?: unknown[],
  ) {
    super(message);
    this.name = name ?? "AppError";
    this.variant = variant;
    this.status = status;
    this.details = details;
  }
}
