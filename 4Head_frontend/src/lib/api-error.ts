type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function collectMessages(
  value: unknown,
  seen: WeakSet<object>,
): string[] {
  if (typeof value === "string") {
    const message = value.trim();
    return message ? [message] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMessages(item, seen));
  }

  if (!isRecord(value)) return [];
  if (seen.has(value)) return [];
  seen.add(value);

  if (value instanceof Error) {
    return collectMessages(value.message, seen);
  }

  // Nest validation errors may expose class-validator constraint messages.
  if (isRecord(value.constraints)) {
    const constraintMessages = Object.values(value.constraints).flatMap(
      (constraint) => collectMessages(constraint, seen),
    );
    if (constraintMessages.length > 0) return constraintMessages;
  }

  // Prefer actionable validation details over a generic "Validation failed".
  for (const key of ["details", "message", "errors"] as const) {
    const messages = collectMessages(value[key], seen);
    if (messages.length > 0) return messages;
  }

  // Support Axios/Nest-style nested envelopes as well as RTK Query's `data`.
  for (const key of ["response", "data"] as const) {
    const messages = collectMessages(value[key], seen);
    if (messages.length > 0) return messages;
  }

  return collectMessages(value.error, seen);
}

function unique(messages: string[]): string[] {
  return [...new Set(messages)];
}

/**
 * Returns the message supplied by the backend for RTK Query, NestJS and
 * ordinary Error responses. A status-based fallback is used only when the
 * server did not supply a human-readable message.
 */
export function getApiErrorMessage(error: unknown): string {
  const result = isRecord(error) ? error : undefined;
  const payloadMessages = result?.data
    ? collectMessages(result.data, new WeakSet())
    : [];

  if (payloadMessages.length > 0) return unique(payloadMessages).join(", ");

  const status = result?.status;
  if (status === "FETCH_ERROR") {
    return "Unable to connect to the server. Check your connection and try again.";
  }
  if (status === "PARSING_ERROR") {
    return "The server returned an unreadable response.";
  }
  if (status === "TIMEOUT_ERROR") {
    return "The server took too long to respond. Please try again.";
  }

  const directMessages = collectMessages(error, new WeakSet());
  if (directMessages.length > 0) return unique(directMessages).join(", ");

  if (typeof status === "number") {
    if (status === 401) return "Authentication is required to continue.";
    if (status === 403) return "You do not have permission to perform this action.";
    if (status === 404) return "The requested record was not found.";
    if (status === 409) return "This request conflicts with an existing record.";
    if (status === 422) return "The submitted data is invalid.";
    if (status >= 500) return "The server could not complete the request.";
  }

  return "The request could not be completed.";
}
