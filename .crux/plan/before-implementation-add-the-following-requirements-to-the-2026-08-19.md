Before implementation, add the following requirements to the plan:

1. REAL-TIME DATA MUST REMAIN SERVER-AUTHORITATIVE

Supabase Realtime events should only act as a trigger to refresh/recalculate

the affected analytics.

Do NOT increment/decrement dashboard counters directly based only on the

Realtime payload.

Example:

New profile inserted

→ Realtime event received

→ getAdminAnalytics() runs

→ database returns authoritative Total Users count

→ UI updates

This prevents the dashboard from drifting away from the actual database.

2. ACTIVE USERS MUST USE user_sessions CORRECTLY

"Active Now" must be calculated from the actual authenticated session/activity

data in user_sessions.

Definition:

Active Now = unique users with meaningful authenticated session activity

within the previous 5 minutes.

Do NOT count multiple sessions from the same user multiple times.

Example:

User A has:

- Desktop session

- Mobile session

- Browser session

They must still count as:

1 active user

not 3.

3. ACTIVE TODAY MUST ALSO BE UNIQUE USERS

Active Today must represent the number of unique users who were active during

the current day.

Do NOT count activity events/sessions as separate users.

4. PLAN DISTRIBUTION MUST REPRESENT CURRENT STATE

get_plan_distribution() must count the user's CURRENT subscription/plan state.

A historical subscription or previous plan must not cause a user to appear

twice.

Every user should belong to exactly one current plan category for this

dashboard:

Free

Standard

Pro

Pro+

5. REAL-TIME MODEL USAGE

For xcomm_model_usage:

A Realtime event should trigger the appropriate analytics refresh.

Do not blindly add +1 to the displayed graph because a database event arrived.

The authoritative aggregate must come from:

get_model_usage_stats()

get_model_leaderboard()

This prevents duplicate events or reconnects from corrupting displayed

statistics.

6. REAL-TIME RECONNECT BEHAVIOR

If the Supabase Realtime connection disconnects and reconnects:

- Do not duplicate statistics.

- Do not double-count events.

- Re-fetch authoritative analytics after reconnect.

- Show the Live indicator only when the realtime connection is actually

  subscribed/healthy.

If Realtime is disconnected, the dashboard should clearly indicate:

"Live connection unavailable"

rather than pretending the data is live.

7. INITIAL LOAD

When the Admin Dashboard opens:

1. Authenticate administrator.

2. Fetch authoritative analytics from getAdminAnalytics().

3. Render the dashboard.

4. Subscribe to relevant Supabase Realtime channels.

5. Update/re-fetch affected analytics when events occur.

Do NOT depend on Realtime events to populate the initial dashboard.

8. DUAL-WINDOW TEST

When two admin dashboard windows are open:

Window A:

Admin Dashboard

Window B:

Admin Dashboard

Trigger:

New user

Plan change

AI request

Activity update

Both windows must eventually display the same authoritative values.

9. NO REVENUE PLACEHOLDER

Because the current schema does not contain actual payment records:

DO NOT create fake revenue numbers.

Do not estimate revenue from plan counts.

If a revenue section exists, display:

"Revenue data unavailable"

and optionally:

"Payment analytics will appear when payment transaction data is connected."

10. SECURITY DEFINER

For SECURITY DEFINER RPCs:

- Explicitly set the search_path safely.

- Verify the authenticated user's admin role inside the function.

- Do not rely on the frontend to determine admin status.

- Do not expose raw user records when only aggregate statistics are required.

- Return only the minimum data required by the Admin Dashboard.

11. PERFORMANCE

Do not execute getAdminAnalytics() for every Realtime event if multiple

events arrive rapidly.

Use a small debounce/coalescing mechanism where appropriate so that bursts

of database events trigger one authoritative refresh instead of dozens of

identical queries.

However, do not introduce noticeable delays for normal events.

12. FINAL REQUIREMENT

The Admin Dashboard must always satisfy:

DATABASE

    ↓

AUTHORITATIVE RPC / SERVER FUNCTION

    ↓

ADMIN ANALYTICS

    ↓

UI

Realtime should be:

DATABASE EVENT

    ↓

REALTIME CHANNEL

    ↓

TRIGGER REFRESH

    ↓

AUTHORITATIVE RPC

    ↓

UI

Never:

DATABASE EVENT

    ↓

DIRECTLY MODIFY UI COUNTER

This ensures the dashboard remains accurate even after reconnects, duplicate

events, concurrent events, or multiple admin windows.