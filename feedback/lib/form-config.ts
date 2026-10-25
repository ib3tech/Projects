// Every question on the form is defined here. The page, the progress bar,
// validation (client and server) and the email body all render from this.

export type Choice = { value: string; label: string };

type Base = {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
};

export type Question =
  | (Base & { kind: "text"; autoComplete?: string })
  | (Base & { kind: "textarea" })
  | (Base & { kind: "scale"; min: number; max: number; lowLabel: string; highLabel: string })
  | (Base & { kind: "single"; options: Choice[] })
  | (Base & { kind: "multi"; options: Choice[] })
  | (Base & { kind: "consent"; checkboxLabel: string });

export type Section = {
  id: string;
  title: string;
  intro?: string;
  questions: Question[];
};

export const MAX_TEXT_LENGTH = 2000;

const rating = (id: string, label: string, required = false): Question => ({
  id,
  label,
  kind: "scale",
  min: 1,
  max: 5,
  lowLabel: "1 = poor",
  highLabel: "5 = excellent",
  required,
});

const note = (id: string, label: string): Question => ({ id, label, kind: "textarea" });

export const FORM: Section[] = [
  {
    id: "about",
    title: "About you and the project",
    questions: [
      { id: "name", label: "Your name", kind: "text", autoComplete: "name", required: true },
      {
        id: "contact",
        label: "WhatsApp number or email",
        kind: "text",
        autoComplete: "email",
        hint: "Only used to follow up on your answers. Your feedback is read by the HomeLink team and nobody else.",
      },
      {
        id: "service",
        label: "Which service did you use?",
        kind: "single",
        required: true,
        options: [
          { value: "property-management", label: "Property management" },
          { value: "rent-collection", label: "Rent collection" },
          { value: "tenant-sourcing", label: "Tenant sourcing" },
          { value: "building-finishing", label: "Building or finishing" },
          { value: "renovation-repairs", label: "Renovation or repairs" },
          { value: "site-land", label: "Site or land project" },
          { value: "inspection", label: "Inspection" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "reference",
        label: "Project reference or location",
        kind: "text",
        hint: "For example HL-024, or Kyanja, Kampala.",
      },
    ],
  },
  {
    id: "time",
    title: "Time",
    questions: [
      rating("speed", "How would you rate the speed of the work?"),
      {
        id: "finished",
        label: "When was the work finished?",
        kind: "single",
        options: [
          { value: "early", label: "Early" },
          { value: "on-time", label: "On time" },
          { value: "little-late", label: "A little late" },
          { value: "much-later", label: "Much later" },
          { value: "not-finished", label: "Not finished" },
        ],
      },
      {
        id: "replySpeed",
        label: "How fast did we usually reply to you?",
        kind: "single",
        options: [
          { value: "hour", label: "Within an hour" },
          { value: "same-day", label: "Same day" },
          { value: "next-day", label: "Next day" },
          { value: "2-3-days", label: "2 to 3 days" },
          { value: "longer", label: "Longer" },
        ],
      },
      note("timeNote", "Where was time lost, if anywhere?"),
    ],
  },
  {
    id: "organisation",
    title: "Organisation and communication",
    questions: [
      rating("organised", "How organised were we?"),
      {
        id: "updates",
        label: "How many updates did you get?",
        kind: "single",
        options: [
          { value: "too-few", label: "Too few" },
          { value: "about-right", label: "About right" },
          { value: "too-many", label: "Too many" },
        ],
      },
      {
        id: "proof",
        label: "What proof of the work did you receive?",
        hint: "Choose all that apply.",
        kind: "multi",
        options: [
          { value: "photos", label: "Photos" },
          { value: "videos", label: "Videos" },
          { value: "receipts", label: "Receipts" },
          { value: "reports", label: "Written reports" },
          { value: "video-calls", label: "Video calls" },
          { value: "none", label: "None" },
        ],
      },
      rating("reach", "How easy was it to reach the right person?"),
      note("commsNote", "Anything to add about organisation or communication?"),
    ],
  },
  {
    id: "price",
    title: "Price and value",
    questions: [
      rating("value", "How would you rate value for money?"),
      {
        id: "fees",
        label: "How did our fees feel?",
        kind: "single",
        options: [
          { value: "too-high", label: "Too high" },
          { value: "slightly-high", label: "Slightly high" },
          { value: "fair", label: "Fair" },
          { value: "low", label: "Low for what we did" },
        ],
      },
      {
        id: "surprise",
        label: "Were there any surprise costs?",
        kind: "single",
        options: [
          { value: "none", label: "None" },
          { value: "small", label: "Small ones" },
          { value: "big", label: "Big ones" },
        ],
      },
      rating("spending", "How confident are you that every pound or shilling was spent properly?"),
      note("priceNote", "Was anything about money unclear?"),
    ],
  },
  {
    id: "quality",
    title: "Quality",
    questions: [
      rating("quality", "How would you rate the quality of the work?"),
      {
        id: "chase",
        label: "Did you have to chase us to fix anything?",
        kind: "single",
        options: [
          { value: "no", label: "No" },
          { value: "one-small", label: "One small thing" },
          { value: "several", label: "Several things" },
          { value: "major", label: "Major problems" },
        ],
      },
      note("qualityNote", "Anything to add about quality?"),
    ],
  },
  {
    id: "overall",
    title: "Overall",
    questions: [
      rating("overall", "Overall, how would you rate HomeLink?", true),
      {
        id: "recommend",
        label: "How likely are you to recommend us to family or friends?",
        kind: "scale",
        min: 0,
        max: 10,
        lowLabel: "0 = not at all",
        highLabel: "10 = definitely",
      },
      {
        id: "again",
        label: "Would you use HomeLink again?",
        kind: "single",
        options: [
          { value: "yes", label: "Yes" },
          { value: "maybe", label: "Maybe" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "offer",
        label: "What else should HomeLink offer?",
        hint: "Choose all that apply.",
        kind: "multi",
        options: [
          { value: "gbp-statements", label: "Statements in GBP" },
          { value: "video-walkthroughs", label: "Monthly video walk-throughs" },
          { value: "whatsapp-updates", label: "WhatsApp updates" },
          { value: "legal-title", label: "Legal and title checks" },
          { value: "insurance", label: "Insurance" },
          { value: "cleaning", label: "Cleaning and caretaking" },
          { value: "furnishing", label: "Furnishing" },
          { value: "land-purchase", label: "Land purchase support" },
          { value: "portal", label: "A client portal" },
        ],
      },
      note("neverChange", "What is the one thing we should never change?"),
      note("fixFirst", "What is the one thing we should fix first?"),
      note("forgot", "Anything we forgot to ask?"),
    ],
  },
  {
    id: "permission",
    title: "Permission",
    questions: [
      {
        id: "quote",
        label: "Can we quote you?",
        kind: "consent",
        checkboxLabel:
          "HomeLink may quote this feedback in marketing, using only my first name and project type.",
      },
    ],
  },
];

export const QUESTIONS: Question[] = FORM.flatMap((s) => s.questions);

// The consent checkbox is a permission, not a question, so it is not counted.
export const COUNTED_QUESTIONS = QUESTIONS.filter((q) => q.kind !== "consent");

export type AnswerValue = string | string[] | boolean;
export type Answers = Record<string, AnswerValue>;

export function emptyAnswers(): Answers {
  const answers: Answers = {};
  for (const q of QUESTIONS) {
    answers[q.id] = q.kind === "multi" ? [] : q.kind === "consent" ? false : "";
  }
  return answers;
}

export function isAnswered(q: Question, value: AnswerValue | undefined): boolean {
  if (q.kind === "multi") return Array.isArray(value) && value.length > 0;
  if (q.kind === "consent") return value === true;
  return typeof value === "string" && value.trim() !== "";
}
