import {
  MAX_TEXT_LENGTH,
  QUESTIONS,
  emptyAnswers,
  isAnswered,
  type Answers,
} from "./form-config";

export type ValidationResult =
  | { ok: true; answers: Answers }
  | { ok: false; errors: Record<string, string> };

// Shared by the browser (to point at missing fields) and the route handler
// (which must not trust the browser). Unknown keys are dropped.
export function validateAnswers(input: unknown): ValidationResult {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const answers = emptyAnswers();
  const errors: Record<string, string> = {};

  for (const q of QUESTIONS) {
    const value = raw[q.id];
    if (value === undefined || value === null) {
      if (q.required) errors[q.id] = requiredMessage(q.kind);
      continue;
    }

    switch (q.kind) {
      case "text":
      case "textarea": {
        if (typeof value !== "string") {
          errors[q.id] = "Please type your answer as text.";
          break;
        }
        // Single-line answers (name, contact, reference) are kept on one line.
        const text = (q.kind === "text" ? value.replace(/\s*[\r\n]+\s*/g, " ") : value).trim();
        if (text.length > MAX_TEXT_LENGTH) {
          errors[q.id] = `Please keep this to ${MAX_TEXT_LENGTH} characters or fewer.`;
          break;
        }
        answers[q.id] = text;
        break;
      }
      case "scale": {
        if (value === "") break;
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isInteger(n) || n < q.min || n > q.max) {
          errors[q.id] = `Please pick a number from ${q.min} to ${q.max}.`;
          break;
        }
        answers[q.id] = String(n);
        break;
      }
      case "single": {
        if (value === "") break;
        if (typeof value !== "string" || !q.options.some((o) => o.value === value)) {
          errors[q.id] = "Please pick one of the options.";
          break;
        }
        answers[q.id] = value;
        break;
      }
      case "multi": {
        if (!Array.isArray(value) || !value.every((v) => q.options.some((o) => o.value === v))) {
          errors[q.id] = "Please pick from the options listed.";
          break;
        }
        answers[q.id] = Array.from(new Set(value as string[]));
        break;
      }
      case "consent": {
        answers[q.id] = value === true;
        break;
      }
    }

    if (q.required && !errors[q.id] && !isAnswered(q, answers[q.id])) {
      errors[q.id] = requiredMessage(q.kind);
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, answers };
}

function requiredMessage(kind: string): string {
  return kind === "text" || kind === "textarea"
    ? "Please fill this in."
    : "Please choose an answer.";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailFrom(contact: unknown): string | null {
  return typeof contact === "string" && EMAIL_PATTERN.test(contact.trim()) ? contact.trim() : null;
}
