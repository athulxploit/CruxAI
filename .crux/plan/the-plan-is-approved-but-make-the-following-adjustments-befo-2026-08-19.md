The plan is approved, but make the following adjustments before implementation.

1. DYNAMIC RESPONSE DEPTH

Keep detectDepth, but do NOT make it depend primarily on keyword matching.

Use the user's actual request, conversation context, requested detail level, task complexity, and technical depth to determine the appropriate response budget.

Keyword signals such as:

- "explain in detail"

- "comprehensive"

- "deep dive"

- "analyze"

- "review this architecture"

may be used as supporting signals, but must NOT be the sole determinant.

detectDepth should act as guidance, not force every response into a fixed length.

2. OUTPUT TOKEN BUDGET

Use the proposed values only as maximum output budgets, NOT target response lengths.

Suggested upper budgets:

Simple:

4096 maximum

Normal:

8192 maximum

Detailed:

16384 maximum

Comprehensive:

Use the largest safe output budget supported by the selected model and current context window, capped by MAX_TOKENS_HARD_CAP.

IMPORTANT:

The model should naturally stop when the answer is complete.

Do NOT instruct the model to fill the entire token budget.

Do NOT intentionally make simple answers longer.

Do NOT increase output limits merely because a user has Pro or Pro+.

Output capacity should primarily depend on:

- task complexity

- requested detail

- selected model capabilities

- provider/model maximum output

- available context window

3. MODEL ROUTING

Absolutely preserve the currently selected model.

The response-length system MUST NOT change model routing.

If the user selects:

Claude Opus 4.6

the response must come from:

anthropic/claude-opus-4.6

If the user selects:

GPT-5.5

the response must come from:

openai/gpt-5.5

Do NOT use another model to generate a longer answer.

Do NOT introduce fallback models.

4. PROVIDER HINTS

Do not introduce provider routing/latency/throughput hints unless the exact parameter is officially supported by the existing provider integration.

Do not modify OpenRouter routing merely for response-length optimization.

Keep the existing working model-routing implementation unchanged.

5. AUTOMATIC CONTINUATION

Do NOT implement automatic continuation in this phase unless it is required by the existing architecture.

If continuation is implemented, it must:

- use the same selected model

- preserve the original conversation context

- never duplicate the previous response

- never create an infinite continuation loop

- never count as another user message

- never bypass the daily quota

- stop when the response is complete

6. PERSONALITY

Keep the XCOMM personality:

- intelligent

- calm

- confident

- professional

- conversational

- occasionally witty

- emotionally aware

- context-aware

Humor and sarcasm must be contextual rather than forced.

Do not make every response playful.

Do not use repetitive AI introductions such as:

"Certainly!"

"Absolutely!"

"Of course!"

unless naturally appropriate.

7. EMOTIONAL ADAPTATION

The model should recognize the user's conversational tone.

Examples:

Frustrated user:

→ acknowledge the frustration and focus on solving the issue.

Excited user:

→ naturally match some of the enthusiasm.

Confused user:

→ simplify and explain progressively.

Serious technical discussion:

→ remain professional and technically focused.

Do not overuse emotional language.

8. MARKDOWN

Improve markdown rendering for:

- nested lists

- headings

- code blocks

- tables

- blockquotes

- inline code

- long technical responses

Do not change the overall XCOMM visual identity.

9. STREAMING

Long responses must stream correctly.

Verify:

- no duplicated tokens

- no missing chunks

- no premature termination

- no markdown corruption

- no UI freezing

- no response replacement while streaming

10. BLUEPRINT / APPENDIX

Keep the existing Blueprint functionality intact.

Only optimize buildSystemAppendix organization if necessary.

Do not remove existing Blueprint context or capabilities.

11. DAILY QUOTA

Do NOT modify the existing daily message quota implementation.

One user request remains one daily message regardless of response length.

Failed provider requests remain excluded according to the existing quota rules.

12. ACCEPTANCE TESTS

After implementation, test at least:

TEST A — SIMPLE

"What is DNS?"

Expected:

Short, direct answer.

TEST B — NORMAL

"Explain how DNS resolution works."

Expected:

Moderate structured explanation.

TEST C — DETAILED

"Explain DNS in detail, including recursive resolution, caching, TTL, authoritative servers, DNSSEC, and common attacks."

Expected:

Long, structured technical answer.

TEST D — COMPLEX

"Design a production-grade multi-region DNS architecture for a cybersecurity SaaS serving 10,000 customers. Include architecture, failure handling, security, caching, DNSSEC, monitoring, disaster recovery, and scaling."

Expected:

Comprehensive answer with appropriate technical depth.

TEST E — CONVERSATIONAL

Send a frustrated conversational message and verify that the response adapts naturally without becoming overly emotional or robotic.

TEST F — MODEL SWITCH

Select Model A → send complex prompt.

Switch to Model B → send another complex prompt.

Verify that both responses come from their respective selected models.

Do not verify model identity from response style alone. Verify actual backend/provider metadata.

13. FINAL IMPLEMENTATION REQUIREMENT

The goal is NOT to make every XCOMM response longer.

The goal is:

Simple question → concise.

Normal question → appropriately detailed.

Complex question → comprehensive.

User explicitly requests depth → genuinely detailed.

The response should maximize usefulness, not token count.

Do not change unrelated functionality.