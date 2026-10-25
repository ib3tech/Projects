"use client";

import { useSubmit } from "@formspree/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Field, focusTargetId } from "@/components/fields";
import { buildBody, buildPlainText, buildSubject } from "@/lib/email";
import {
  COUNTED_QUESTIONS,
  FORM,
  QUESTIONS,
  emptyAnswers,
  isAnswered,
  type AnswerValue,
  type Answers,
} from "@/lib/form-config";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { emailFrom, validateAnswers } from "@/lib/validate";

// Formspree form IDs are public by design; this one sends to the email set in
// the Formspree dashboard.
const FORMSPREE_FORM_ID = "maqbrpnz";

const DRAFT_KEY = "homelink-feedback-draft-v1";

// Storage can be missing or throw (private mode, blocked site data), so every
// access is wrapped and the form works the same without it.
function loadDraft(): Answers | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const answers = emptyAnswers();
    let found = false;
    for (const q of QUESTIONS) {
      const v = saved[q.id];
      if (typeof v === typeof answers[q.id] && Array.isArray(v) === Array.isArray(answers[q.id])) {
        answers[q.id] = v as AnswerValue;
        found ||= isAnswered(q, answers[q.id]);
      }
    }
    return found ? answers : null;
  } catch {
    return null;
  }
}

function saveDraft(answers: Answers) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers, or clipboard blocked: fall back to a hidden textarea.
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

type Status = "idle" | "sending" | "failed" | "sent";

export default function FeedbackForm() {
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState("");
  const [copied, setCopied] = useState<"" | "yes" | "no">("");
  const [restored, setRestored] = useState(false);
  const sending = useRef(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const submitToFormspree = useSubmit<Record<string, string>>(FORMSPREE_FORM_ID);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      // Restoring after mount keeps the server and first client render identical.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswers(draft);
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    if (status === "sent") successHeading.current?.focus();
  }, [status]);

  const answered = COUNTED_QUESTIONS.filter((q) => isAnswered(q, answers[q.id])).length;
  const total = COUNTED_QUESTIONS.length;

  function update(id: string, value: AnswerValue) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    saveDraft(next);
    setCopied("");
    if (errors[id]) {
      const rest = { ...errors };
      delete rest[id];
      setErrors(rest);
    }
  }

  function startAgain() {
    clearDraft();
    setAnswers(emptyAnswers());
    setErrors({});
    setRestored(false);
  }

  function showErrors(found: Record<string, string>) {
    setErrors(found);
    const first = QUESTIONS.find((q) => found[q.id]);
    const el = first && document.getElementById(focusTargetId(first));
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending.current) return;

    const result = validateAnswers(answers);
    if (!result.ok) {
      showErrors(result.errors);
      return;
    }

    sending.current = true;
    setStatus("sending");
    setFailure("");
    setCopied("");
    try {
      const replyTo = emailFrom(result.answers.contact);
      const sent = await submitToFormspree({
        _subject: buildSubject(result.answers),
        message: buildBody(result.answers),
        // Formspree uses an "email" field as the Reply-To address.
        ...(replyTo ? { email: replyTo } : {}),
        [HONEYPOT_FIELD]: honeypot.current?.value ?? "",
      });

      if (sent.kind === "success") {
        clearDraft();
        setStatus("sent");
        return;
      }
      const errs = [
        ...sent.getFormErrors(),
        ...sent.getAllFieldErrors().flatMap(([, fieldErrs]) => fieldErrs),
      ];
      console.error("Formspree rejected the submission", errs);
      setStatus("failed");
      // Formspree's own errors carry a code; network failures come back as UNSPECIFIED.
      setFailure(
        errs.some((err) => err.code !== "UNSPECIFIED")
          ? `The form service said: ${errs.map((err) => err.message).join(" ")}`
          : "We could not reach the form service. Check your internet connection.",
      );
    } catch {
      setStatus("failed");
      setFailure("We could not connect. Check your internet connection.");
    } finally {
      sending.current = false;
    }
  }

  async function onCopy() {
    setCopied((await copyText(buildPlainText(answers))) ? "yes" : "no");
  }

  if (status === "sent") {
    const firstName = String(answers.name).trim().split(/\s+/)[0];
    return (
      <div className="mx-auto mt-6 max-w-2xl rounded-3xl border border-line bg-surface p-6 text-center sm:p-10">
        <h1
          ref={successHeading}
          tabIndex={-1}
          className="font-display text-3xl font-semibold text-ink"
        >
          Thank you{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-3 text-lg text-muted">
          Your feedback is with the HomeLink team, and we read every answer.
        </p>
      </div>
    );
  }

  const isSending = status === "sending";

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-semibold" id="progress-label">
            {answered} of {total} questions answered
          </p>
          <div
            role="progressbar"
            aria-labelledby="progress-label"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={answered}
            className="mt-2 h-2 overflow-hidden rounded-full bg-line"
          >
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-300"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        <h1 className="mt-8 font-display text-3xl font-semibold leading-tight sm:text-4xl">
          How did we do?
        </h1>
        <p className="mt-3 text-muted">
          Your project has been handed over. Tell us honestly how it went. Only three questions are
          required, and it takes about five minutes.
        </p>

        {restored && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <p className="text-sm">We kept the answers you started earlier.</p>
            <button
              type="button"
              onClick={startAgain}
              className="min-h-12 rounded-xl px-3 text-sm font-semibold text-accent underline underline-offset-4"
            >
              Start again
            </button>
          </div>
        )}

        <form noValidate onSubmit={onSubmit} className="mt-6 space-y-6">
          {FORM.map((section, index) => (
            <fieldset
              key={section.id}
              className="rounded-3xl border border-line bg-surface p-4 sm:p-6"
            >
              <legend className="float-left w-full">
                <h2 className="font-display text-2xl font-semibold">
                  <span className="mr-2 text-gold" aria-hidden="true">
                    {index + 1}.
                  </span>
                  {section.title}
                </h2>
              </legend>
              <div className="clear-both space-y-7 pt-5">
                {section.questions.map((q) => (
                  <Field
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    error={errors[q.id]}
                    onChange={(v) => update(q.id, v)}
                  />
                ))}
              </div>
            </fieldset>
          ))}

          {/* Hidden from people and assistive tech; bots tend to fill it in. */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor={HONEYPOT_FIELD}>Leave this empty</label>
            <input
              ref={honeypot}
              id={HONEYPOT_FIELD}
              name={HONEYPOT_FIELD}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>

          {Object.keys(errors).length > 0 && status !== "failed" && (
            <p className="text-sm font-semibold text-danger">
              Please answer the highlighted {Object.keys(errors).length === 1 ? "question" : "questions"} above.
            </p>
          )}

          {status === "failed" && (
            <div
              role="alert"
              className="rounded-2xl border border-danger bg-danger-soft p-4 text-ink"
            >
              <p className="font-semibold">Your feedback has not been sent. {failure}</p>
              <p className="mt-2 text-sm">
                Your answers are still here. Try sending again, or copy your feedback and send it
                to us on WhatsApp.
              </p>
              <button
                type="button"
                onClick={onCopy}
                className="mt-3 min-h-12 w-full rounded-xl border border-accent bg-surface px-4 font-semibold text-accent sm:w-auto"
              >
                Copy my feedback
              </button>
              <p aria-live="polite" className="mt-2 text-sm">
                {copied === "yes" && "Copied. Paste it into a WhatsApp message to us."}
                {copied === "no" && "Copying did not work on this device. Please try again."}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSending}
            className="min-h-12 w-full rounded-xl bg-accent px-6 text-lg font-semibold text-accent-ink shadow-sm transition-opacity disabled:cursor-wait disabled:opacity-60"
          >
            {isSending ? "Sending…" : status === "failed" ? "Try sending again" : "Send feedback"}
          </button>
        </form>
      </div>
    </>
  );
}
