import { FORM, QUESTIONS, isAnswered, type Answers, type Question } from "./form-config";

// Pulled to the top of the email for a quick read, and not repeated below.
const AT_A_GLANCE: [label: string, id: string][] = [
  ["Fix first", "fixFirst"],
  ["Never change", "neverChange"],
  ["Overall", "overall"],
  ["Recommend", "recommend"],
];
const GLANCE_IDS = new Set(AT_A_GLANCE.map(([, id]) => id));

const byId = (id: string) => QUESTIONS.find((q) => q.id === id)!;

export function formatAnswer(q: Question, value: Answers[string]): string {
  switch (q.kind) {
    case "scale":
      return `${value}/${q.max}`;
    case "single":
      return q.options.find((o) => o.value === value)?.label ?? String(value);
    case "multi":
      return (value as string[])
        .map((v) => q.options.find((o) => o.value === v)?.label ?? v)
        .join(", ");
    case "consent":
      return value === true
        ? "Yes, may quote (first name and project type only)"
        : "No, do not quote";
    default:
      return String(value);
  }
}

export function buildSubject(answers: Answers): string {
  const service = formatAnswer(byId("service"), answers.service);
  return `HomeLink feedback: ${answers.name} - ${service} - ${answers.overall}/5`;
}

// Plain text, short lines, readable on a phone. Unanswered optional
// questions are skipped; the consent answer is always shown.
export function buildBody(answers: Answers): string {
  const out: string[] = [];

  out.push("AT A GLANCE");
  for (const [label, id] of AT_A_GLANCE) {
    const q = byId(id);
    out.push(`${label}: ${isAnswered(q, answers[id]) ? formatAnswer(q, answers[id]) : "(not answered)"}`);
  }

  for (const section of FORM) {
    const lines: string[] = [];
    for (const q of section.questions) {
      if (GLANCE_IDS.has(q.id)) continue;
      const value = answers[q.id];
      if (q.kind !== "consent" && !isAnswered(q, value)) continue;
      lines.push(q.label, `> ${formatAnswer(q, value)}`, "");
    }
    if (lines.length === 0) continue;
    out.push("", "", section.title.toUpperCase(), "", ...lines.slice(0, -1));
  }

  return out.join("\n");
}

export function buildPlainText(answers: Answers): string {
  return `${buildSubject(answers)}\n\n${buildBody(answers)}`;
}
