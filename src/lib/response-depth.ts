// Answer depth / output-capacity control.
//
// IMPORTANT: this is deliberately SEPARATE from reasoning effort. Reasoning
// effort controls how hard the model thinks; depth controls how much output
// capacity the answer is allowed to use. A "medium" reasoning setting must
// never force a short answer.
//
// Budgets are MAXIMUMS, never targets — the model stops naturally when the
// answer is complete.

export type ResponseDepth = "simple" | "normal" | "detailed" | "comprehensive";

export const DEPTH_BUDGET: Record<ResponseDepth, number> = {
  simple: 4096,
  normal: 8192,
  detailed: 16384,
  comprehensive: 32768,
};

const EXPLICIT_DEPTH =
  /\b(in detail|detailed|comprehensive|deep dive|deep research|thorough|exhaustive|step[- ]by[- ]step|full (guide|breakdown|analysis)|walk me through|elaborate)\b/i;

const COMPLEX_TASK =
  /\b(architecture|design|implement|implementation|refactor|migrate|audit|optimi[sz]e|debug|benchmark|scal(e|ing)|security|threat model|trade[- ]?offs?|compare|evaluate|production[- ]grade|end[- ]to[- ]end|multi[- ]region|disaster recovery|roadmap|research)\b/i;

const BREVITY = /\b(short|brief|briefly|concise|one[- ]?liner|tl;?dr|in a sentence|quick answer|just tell me)\b/i;

const CODE_FENCE = /```/;

export function detectDepth(
  text: string,
  opts: { hasAttachments?: boolean; turnCount?: number } = {},
): ResponseDepth {
  const t = (text || "").trim();
  if (!t) return "normal";
  if (BREVITY.test(t)) return "simple";

  const words = t.split(/\s+/).filter(Boolean).length;
  const questionMarks = (t.match(/\?/g) || []).length;
  const listItems = (t.match(/^\s*(?:[-*•]|\d+[.)])\s+/gm) || []).length;

  let score = 0;
  if (words > 15) score += 1;
  if (words > 45) score += 1;
  if (words > 120) score += 1;
  if (questionMarks > 1) score += 1;
  if (listItems >= 3) score += 1;
  if (CODE_FENCE.test(t) || t.length > 1200) score += 1;
  if (COMPLEX_TASK.test(t)) score += 1;
  if (EXPLICIT_DEPTH.test(t)) score += 2;
  if (opts.hasAttachments) score += 1;

  if (score >= 5) return "comprehensive";
  if (score >= 3) return "detailed";
  if (score >= 1) return "normal";
  return "simple";
}

/** Max output budget for a request, capped by the hard cap. */
export function budgetForDepth(depth: ResponseDepth, hardCap = DEPTH_BUDGET.comprehensive): number {
  return Math.min(DEPTH_BUDGET[depth], hardCap);
}

/**
 * Guidance appended to the system prompt. Explicitly decouples depth from
 * reasoning effort and forbids padding to fill the budget.
 */
export const DEPTH_GUIDANCE = `

RESPONSE DEPTH:
Answer depth is independent of reasoning effort. Never shorten a response just because reasoning effort is low or medium.
- Simple/casual questions: answer concisely and directly.
- Normal questions: a clear, appropriately structured explanation.
- Technical, multi-part or complex questions: give a genuinely detailed, well-structured answer — explanation, concrete examples, implementation details, edge cases, failure modes and practical recommendations.
- When the user explicitly asks for depth (detail, comprehensive, deep dive, review, design): be thorough.
Never truncate mid-answer, never say the answer is shortened for brevity, and never pad an answer to fill space. Stop when the answer is genuinely complete. Never reveal raw chain-of-thought.`;
