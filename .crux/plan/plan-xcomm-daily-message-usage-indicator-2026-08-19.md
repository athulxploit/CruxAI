# Plan: XCOMM Daily Message Usage Indicator

Implement a server-authoritative daily message counter for XCOMM AI that updates immediately after successful responses, provides a tiered warning system as the user approaches their limit, and dynamically calculates reset times.

## User Review Required

> [!IMPORTANT]

> The counter will be authoritative on the server. Failed AI requests (4xx, 5xx, timeouts, provider errors) will NOT consume a message. The UI will show a countdown such as "19 messages left" and transition to a warning such as "3 messages left today" when near the limit.

- **Storage**: Daily usage will be stored in the existing `public.xcomm_model_usage` table.

- **Authoritative Check**: The backend `ai-stream.ts` will verify remaining messages through the `consume_message_quota` RPC before calling any AI provider.

- **Concurrency Safety**: The quota check/reservation must be atomic so simultaneous requests cannot consume the same final available message twice.

- **Consumption Logic**: A message is consumed exactly once only when the selected AI provider successfully begins generating the actual response. A provider/API failure must not consume the message.

- **Failed Requests**: HTTP 4xx, 5xx, 402, 429, timeouts before generation, authorization failures, model-unavailable errors, and other provider/backend failures must NOT consume a message.

- **Reset Logic**: Daily limits reset at 00:00 in the user's configured/account timezone. The backend must be authoritative for determining the current usage window and reset time.

- **UI Indicator**: A dynamic message below the chat input will show remaining count, warnings, or reset time when blocked.

- **Model Independence**: The daily message allowance is shared across all models available to the user's subscription. There are NO separate user-facing message quotas for individual models.

## Technical Details

### 1. Database & Schema

- Update `supabase/migrations/20260818000000_xcomm_model_usage.sql` or create a new migration to ensure `consume_message_quota` and usage tracking align with the "exactly 1 message per successful AI response" requirement.

- Add a helper function to calculate the next daily reset time using the user's configured/account timezone.

- Ensure quota reservation/consumption is atomic and concurrency-safe.

- If a user has exactly 1 message remaining and two requests arrive simultaneously, only one request may consume the final message.

- The second request must be rejected with the daily-limit response.

- The database must remain the authoritative source for usage enforcement.

### 2. Backend Implementation `src/routes/api/ai-stream.ts`)

- Update the `POST` handler to fetch the user's plan and daily message limit.

- Refine the `consume_message_quota` flow to be strictly authoritative and concurrency-safe.

- The system must verify that the user has a remaining message before allowing the request to proceed.

- Do NOT permanently consume the message before the AI request succeeds.

- Use an atomic reservation/commit/release mechanism, or an equivalent concurrency-safe implementation.

- A reserved message must be released if the provider request fails before actual generation begins.

- A message must be committed exactly once when the selected AI provider successfully begins generating the actual response.

- Do not count a message merely because an HTTP 200 response was received if no actual response generation occurred.

The following MUST NOT consume a message:

- HTTP 400

- HTTP 401

- HTTP 402

- HTTP 403

- HTTP 404

- HTTP 429

- HTTP 5xx

- provider timeout before generation

- model unavailable

- authorization failure

- backend/provider failure

- malformed request

- any other request that does not successfully begin actual AI generation

Example:

GLM-5.2 selected

→ OpenRouter returns 429

→ message count remains unchanged

Do NOT fall back to another model to make the request appear successful.

### 3. Model Independence

The daily message counter is completely independent of model selection.

Users consume from ONE shared daily message allowance regardless of which unlocked model they select.

Example:

- Nemotron → 1 message

- GLM → 1 message

- GPT-5.4 Mini → 1 message

- Claude → 1 message

- Nemotron Super → 1 message

All consume from the same daily allowance.

Do NOT create separate user-facing message quotas for individual models.

The subscription tier determines:

- which models the user can access

- how many messages the user can successfully generate per day

The selected model determines:

- which AI provider/model generates the response

Internal token usage may still be tracked separately for cost, analytics, and infrastructure monitoring, but it must NOT create separate user-facing model message quotas.

### 4. Frontend Implementation

**Store Updates `src/lib/app-store.ts`)**

Update state to include:

- `dailyUsage.used`

- `dailyUsage.limit`

- `dailyUsage.remaining`

- `dailyUsage.resetTime`

The frontend must treat these values as server-authoritative.

**Limit Hook `src/lib/msg-limit.ts`)**

Rewrite `useMessageLimit` to fetch authoritative usage data from the backend instead of relying on `localStorage` for enforcement.

The frontend may cache/display the returned value for UI purposes, but it must never be the source of truth for authorization or quota enforcement.

**UI Component `src/components/arch/chat-input.tsx`)**

Update the existing limit display logic to match these requirements:

- When more than 3 messages remain:

  - `"X messages left"`

- When 3, 2, or 1 messages remain:

  - `"X messages left today"`

- When 0 messages remain:

  - `"Daily message limit reached. Resets at [Time]"`

The counter must be visible from the beginning of the daily usage period.

Example:

20 messages left

19 messages left

18 messages left

...

4 messages left

3 messages left today

2 messages left today

1 message left today

Daily message limit reached. Resets at 12:00 AM

The warning should only become more noticeable when 3 or fewer messages remain.

Ensure the counter updates immediately after every successfully completed AI response through the existing `CustomEvent` mechanism.

### 5. Reset Time

- Daily usage resets at 00:00 according to the user's configured/account timezone.

- Do NOT hardcode UTC midnight as the user-facing reset time.

- The backend must determine the current daily usage window.

- The backend must calculate and return the next reset timestamp.

- The frontend should display the reset time using the user's local/account timezone.

- The reset must happen automatically when the new daily usage window begins.

Example:

If the user's timezone is `Asia/Kolkata`:

Daily reset → 00:00 IST

### 6. Successful Message Accounting

After a successful AI generation begins:

- Commit exactly 1 message to the user's daily usage.

- Return the updated `used` count.

- Return the updated `remaining` count.

- Return the reset time.

- Update the frontend immediately.

Do NOT increment more than once for a single user request.

Streaming must not cause multiple increments.

If the provider starts generating and then fails midway, follow the existing successful-generation accounting policy consistently, but never increment multiple times for the same request.

### 7. Failed Request Accounting

Failed requests must not consume the user's daily message allowance when generation never successfully begins.

Examples:

- GLM-5.2 returns 429 → no message consumed.

- OpenRouter returns 402 → no message consumed.

- Model unavailable → no message consumed.

- Invalid API key → no message consumed.

- Backend error before generation → no message consumed.

- Unauthorized model → no message consumed.

The user must not lose a daily message because XCOMM failed to generate a response.

### 8. Limit Enforcement

Before calling an AI provider, the backend must verify:

1. User identity

2. User subscription tier

3. User daily message limit

4. Messages already used in the current daily window

5. Remaining messages

6. Selected model entitlement

7. Atomic quota availability

If remaining messages = 0:

- reject the request

- do not call the AI provider

- do not consume a message

- return the remaining count and reset time

- display the daily limit message

### 9. Verification

Test with a mock/test user and real runtime requests to ensure:

#### Test 1 — Normal successful request

- Start with a known daily allowance.

- Send a successful AI request.

- Verify exactly 1 message is consumed.

#### Test 2 — Failed provider request

- Select a model that returns a provider error such as GLM-5.2 HTTP 429.

- Verify the request fails.

- Verify the daily message count does NOT decrease.

#### Test 3 — Model switching

Switch models in the same conversation:

Nemotron → GLM → GPT → Claude

Verify that every successful request consumes exactly 1 message from the SAME shared daily counter.

There must be no per-model counters.

#### Test 4 — Three-message warning

Start with a test limit and verify:

- 4 remaining → normal indicator

- 3 remaining → `"3 messages left today"`

- 2 remaining → `"2 messages left today"`

- 1 remaining → `"1 message left today"`

#### Test 5 — Limit reached

When remaining = 0:

- Chat request is blocked.

- No provider request is made.

- UI displays:

  `"Daily message limit reached. Resets at [Time]"`

#### Test 6 — Reset

Verify that the counter resets at 00:00 in the user's configured/account timezone.

#### Test 7 — Concurrent requests

With exactly 1 message remaining, send two requests simultaneously.

Expected result:

- Only one request may consume the final message.

- The other request must be rejected.

- Usage must never become negative.

- The user must never receive more successful messages than their daily allowance.

### 10. Important Security Requirements

- The frontend counter must NOT be trusted for enforcement.

- `localStorage` must NOT be trusted for enforcement.

- The backend/database must be authoritative.

- Users must not be able to bypass the limit by refreshing the page.

- Users must not be able to bypass the limit by opening another browser tab.

- Users must not be able to bypass the limit by changing frontend state.

- Users must not be able to bypass the limit by directly calling the API.

- The quota operation must be atomic and concurrency-safe.

### 11. Acceptance Criteria

[ ] Remaining messages are visible from the beginning of the day

[ ] Counter starts at the user's full daily allowance

[ ] Counter decreases by exactly 1 after each successful AI generation

[ ] Failed requests do not consume messages

[ ] HTTP 402 does not consume a message

[ ] HTTP 429 does not consume a message

[ ] HTTP 5xx does not consume a message

[ ] Model-unavailable errors do not consume a message

[ ] Unauthorized model requests do not consume a message

[ ] At 3 messages remaining, a visible reminder appears

[ ] 2 and 1 messages remaining continue showing the warning

[ ] At 0, sending is blocked

[ ] Reset time is displayed when blocked

[ ] Reset time is dynamically calculated

[ ] Reset uses the user's configured/account timezone

[ ] Counter resets automatically at the correct reset time

[ ] Backend is authoritative

[ ] Database quota enforcement is atomic

[ ] Concurrent requests cannot bypass the limit

[ ] No per-model user-facing message quotas exist

[ ] Switching models does not create separate counters

[ ] Token usage can still be tracked internally for cost/analytics

[ ] Existing UI remains visually unchanged except for the requested usage indicator/reminder

### 12. Final Report

After implementation, report:

- Where daily usage is stored

- How the backend atomically enforces the limit

- How successful requests consume exactly one message

- How failed requests are prevented from consuming messages

- How concurrent requests are handled

- How reset time is calculated

- Which component displays the remaining messages

- How the frontend receives updated usage

- Confirmation that failed requests do not consume messages

- Confirmation that all models share the same daily message allowance

- Confirmation that there are no per-model user-facing quotas

- Any remaining issues or limitations