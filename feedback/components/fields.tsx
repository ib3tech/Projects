import { MAX_TEXT_LENGTH, type AnswerValue, type Question } from "@/lib/form-config";

type FieldProps = {
  question: Question;
  value: AnswerValue;
  error?: string;
  onChange: (value: AnswerValue) => void;
};

// DOM id of the element that receives focus when this question has an error.
export function focusTargetId(q: Question): string {
  return q.kind === "text" || q.kind === "textarea" || q.kind === "consent"
    ? `q-${q.id}`
    : `q-${q.id}-0`;
}

function describedBy(q: Question, error?: string, extra?: string) {
  return [q.hint && `q-${q.id}-hint`, extra, error && `q-${q.id}-error`].filter(Boolean).join(" ") || undefined;
}

function RequiredTag() {
  return (
    <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 align-middle text-xs font-semibold text-ink">
      Required
    </span>
  );
}

function Hint({ q }: { q: Question }) {
  return q.hint ? (
    <p id={`q-${q.id}-hint`} className="mt-1 text-sm text-muted">
      {q.hint}
    </p>
  ) : null;
}

function ErrorText({ q, error }: { q: Question; error?: string }) {
  return error ? (
    <p id={`q-${q.id}-error`} className="mt-2 flex items-start gap-2 text-sm font-semibold text-danger">
      <span aria-hidden="true">!</span>
      {error}
    </p>
  ) : null;
}

const inputBase =
  "mt-2 block w-full rounded-xl border bg-surface px-4 py-3 text-base text-ink placeholder:text-muted/70 " +
  "min-h-12 transition-colors focus-visible:border-accent";

export function Field({ question: q, value, error, onChange }: FieldProps) {
  const invalid = error ? true : undefined;
  const border = error ? "border-danger" : "border-line";

  if (q.kind === "text" || q.kind === "textarea") {
    const text = value as string;
    const Tag = q.kind === "text" ? "input" : "textarea";
    return (
      <div>
        <label htmlFor={`q-${q.id}`} className="block font-semibold">
          {q.label}
          {q.required && <RequiredTag />}
        </label>
        <Hint q={q} />
        <Tag
          id={`q-${q.id}`}
          name={q.id}
          value={text}
          maxLength={MAX_TEXT_LENGTH}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          aria-required={q.required || undefined}
          aria-describedby={describedBy(q, error)}
          {...(q.kind === "text"
            ? { type: "text", autoComplete: q.autoComplete ?? "off" }
            : { rows: 3 })}
          className={`${inputBase} ${border} ${q.kind === "textarea" ? "resize-y" : ""}`}
        />
        {text.length > MAX_TEXT_LENGTH - 300 && (
          <p className="mt-1 text-right text-sm text-muted">
            {text.length} / {MAX_TEXT_LENGTH}
          </p>
        )}
        <ErrorText q={q} error={error} />
      </div>
    );
  }

  if (q.kind === "consent") {
    return (
      <div>
        <p className="font-semibold">{q.label}</p>
        <label
          htmlFor={`q-${q.id}`}
          className={`mt-2 flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border ${border} bg-surface px-4 py-3`}
        >
          <input
            id={`q-${q.id}`}
            type="checkbox"
            name={q.id}
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            aria-describedby={describedBy(q, error)}
            className="mt-1 size-5 shrink-0 accent-accent"
          />
          <span>{q.checkboxLabel}</span>
        </label>
        <ErrorText q={q} error={error} />
      </div>
    );
  }

  const scaleId = q.kind === "scale" ? `q-${q.id}-scale` : undefined;

  return (
    <fieldset
      role={q.kind === "multi" ? undefined : "radiogroup"}
      aria-invalid={q.kind === "multi" ? undefined : invalid}
      aria-required={q.required || undefined}
      aria-describedby={describedBy(q, error, scaleId)}
    >
      <legend className="font-semibold">
        {q.label}
        {q.required && <RequiredTag />}
      </legend>
      <Hint q={q} />

      {q.kind === "scale" && (
        <>
          <div
            className={`mt-3 grid ${q.max - q.min + 1 > 5 ? "grid-cols-6 gap-1.5 sm:grid-cols-11" : "grid-cols-5 gap-2"}`}
          >
            {Array.from({ length: q.max - q.min + 1 }, (_, i) => {
              const n = String(q.min + i);
              return (
                <label
                  key={n}
                  className={
                    "relative flex min-h-12 cursor-pointer items-center justify-center rounded-xl border bg-surface " +
                    `text-lg font-semibold tabular-nums transition-colors ${border} ` +
                    "hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink " +
                    "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
                  }
                >
                  <input
                    id={`q-${q.id}-${i}`}
                    type="radio"
                    name={q.id}
                    value={n}
                    checked={value === n}
                    onChange={() => onChange(n)}
                    className="sr-only"
                  />
                  {n}
                </label>
              );
            })}
          </div>
          <p id={scaleId} className="mt-2 flex justify-between gap-4 text-sm text-muted">
            <span>{q.lowLabel}</span>
            <span className="text-right">{q.highLabel}</span>
          </p>
        </>
      )}

      {(q.kind === "single" || q.kind === "multi") && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {q.options.map((o, i) => {
            const selected = Array.isArray(value) ? value : [];
            const checked = q.kind === "single" ? value === o.value : selected.includes(o.value);
            return (
              <label
                key={o.value}
                className={
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-surface px-4 py-2 transition-colors " +
                  `${border} hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-accent-soft`
                }
              >
                <input
                  id={`q-${q.id}-${i}`}
                  type={q.kind === "single" ? "radio" : "checkbox"}
                  name={q.id}
                  value={o.value}
                  checked={checked}
                  onChange={(e) =>
                    q.kind === "single"
                      ? onChange(o.value)
                      : onChange(
                          e.target.checked
                            ? [...selected, o.value]
                            : selected.filter((v) => v !== o.value),
                        )
                  }
                  className="size-5 shrink-0 accent-accent"
                />
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
      )}

      <ErrorText q={q} error={error} />
    </fieldset>
  );
}
