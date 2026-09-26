const SENSITIVE = /authorization|password|token|secret|otp|cookie|email|phone|code/i;

export function redact(fields: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    output[key] = SENSITIVE.test(key) ? "[redacted]" : value;
  }
  return output;
}

export function logInfo(message: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ time: new Date().toISOString(), level: "info", message, ...redact(fields) }));
}

export function logError(message: string, fields: Record<string, unknown> = {}): void {
  console.error(JSON.stringify({ time: new Date().toISOString(), level: "error", message, ...redact(fields) }));
}

export async function timed<T>(name: string, requestId: string, work: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    return await work();
  } finally {
    logInfo("timing", { name, requestId, durationMs: Date.now() - started });
  }
}
