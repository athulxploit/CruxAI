The plan is approved, with the following decisions and modifications.

==================================================

1. /agent-test → /model-test

==================================================

DO NOT simply delete the `/agent-test` functionality.

Refactor it into a model testing/verification route, preferably:

`/model-test`

Its purpose is now to test XCOMM's DIRECT MODEL ROUTING architecture.

It should allow an administrator to select a registered model and verify:

- Display Model

- Internal Model ID

- Provider

- Configured Provider/OpenRouter ID

- Actual Model ID Sent

- Returned Model ID

- HTTP Status

- Response Received

- Fallback Status

- Latency

- Vision Capability

- Provider Error

- Actual test response

The test MUST verify the actual backend/provider metadata rather than assuming that HTTP 200 means the correct model was used.

The route should test models directly.

It must NOT depend on:

- pulse-1

- forge-1

- cipher-1

- agents_config

- legacy agent mappings

This becomes the permanent XCOMM model-routing diagnostic tool.

==================================================

2. WORKSPACES

==================================================

KEEP the existing Workspaces feature.

However, remove legacy execution-agent identifiers from Workspace categorization.

Do NOT delete Workspaces.

If workspace metadata currently contains tags such as:

- Forge-1

- Cipher-1

- Pulse-1

replace those legacy identifiers with capability/category terminology such as:

- Engineering

- Security

- Research

- Analysis

- Coding

- Writing

- Data

- General

Use the categories that actually match the existing workspace.

IMPORTANT:

A Workspace may provide:

- context

- instructions

- tools

- files

- workflow configuration

- task-specific behavior

but it must NOT secretly route the request through pulse-1, forge-1, or cipher-1.

The selected model remains the actual execution model.

==================================================

3. DO NOT DELETE ALL "AGENT" CONCEPTS BLINDLY

==================================================

The objective is to remove the LEGACY INTERNAL EXECUTION AGENTS:

- pulse-1

- forge-1

- cipher-1

Do NOT interpret this as permanently deleting every future possibility of an XCOMM "Agent".

Separate:

LEGACY EXECUTION AGENTS

- pulse-1

- forge-1

- cipher-1

from:

FUTURE/USER-FACING AGENTS

- user-created agents

- configurable agents

- agent-like workflows

If an `agent` field is used exclusively for the legacy execution architecture, remove it.

If an `agent` field is required by a legitimate non-legacy feature, preserve it and document why.

Do not break unrelated functionality simply because it contains the word "agent".

==================================================

4. agents_config DATABASE TABLE

==================================================

Do NOT immediately DROP `agents_config`.

First perform a complete dependency audit.

Determine:

- which code reads it

- which code writes it

- which UI uses it

- which routes use it

- whether any current non-legacy feature depends on it

- whether any RLS policies depend on it

- whether migrations depend on it

If it is exclusively used by:

- pulse-1

- forge-1

- cipher-1

- legacy model execution

then remove its ACTIVE application dependency.

Only remove the actual database table through a migration if the audit confirms it has no legitimate current consumer.

Do not destroy unrelated data or schema blindly.

==================================================

5. MODEL ROUTING MUST REMAIN SIMPLE

==================================================

The final architecture must be:

USER

 ↓

AUTHENTICATION

 ↓

PREFERRED MODEL

 ↓

MODEL REGISTRY

 ↓

CAPABILITY/TIER CHECK

 ↓

DAILY QUOTA

 ↓

PROVIDER

 ↓

EXACT SELECTED MODEL

 ↓

STREAM RESPONSE

There must be no:

USER

 ↓

AGENT

 ↓

MODEL

layer.

==================================================

6. MODEL SWITCHING

==================================================

Verify that changing the model in the selector changes the actual model used for the NEXT request.

Example:

Turn 1:

GPT-5.5 Terra

→ `openai/gpt-5.5`

Turn 2:

Claude Sonnet 5

→ `anthropic/claude-sonnet-5`

Turn 3:

GLM-5.2

→ `z-ai/glm-5.2:free`

No cached previous model.

No default agent.

No automatic substitution.

No pulse-1.

No forge-1.

No cipher-1.

==================================================

7. IMAGE ROUTING

==================================================

Preserve the current working multimodal architecture.

For a vision-capable model:

USER

 ↓

SELECTED MODEL

 ↓

supportsVision CHECK

 ↓

IMAGE

 ↓

SELECTED PROVIDER

 ↓

EXACT SELECTED MODEL

 ↓

VISION RESPONSE

For a non-vision model:

→ show the existing vision warning

→ do NOT fallback

→ do NOT select another model

→ do NOT use an agent

==================================================

8. ADMIN DASHBOARD

==================================================

Remove legacy Agent Management UI if it exists exclusively for:

- pulse-1

- forge-1

- cipher-1

- agents_config

- model_assignments related to legacy execution

However, keep any legitimate future/user-facing Agent functionality if it exists independently.

The Admin Dashboard should focus on:

- users

- subscriptions

- usage

- models

- model performance

- analytics

- system health

rather than legacy internal agent execution.

==================================================

9. VERIFICATION REQUIREMENT

==================================================

After the migration, perform a full repository search for:

`pulse-1`

`forge-1`

`cipher-1`

Report EVERY remaining occurrence.

Classify each occurrence as:

- ACTIVE RUNTIME DEPENDENCY

- DATABASE/MIGRATION HISTORY

- DOCUMENTATION

- TEST FIXTURE

- HARMLESS HISTORICAL REFERENCE

There must be ZERO ACTIVE RUNTIME DEPENDENCIES on these three legacy agents.

==================================================

10. FINAL MODEL TEST

==================================================

The new `/model-test` route must verify at least:

1. Nemotron-3 Nano

2. GPT-5.4 Nano

3. GPT-5.5 Terra

4. Claude Sonnet 5

5. GLM-5.2

6. Claude Opus 4.6

For each test verify:

Configured ID

→ ID Sent

→ ID Returned

and ensure they match.

If they do not match:

FAIL the test.

Do not call a request VERIFIED simply because it returned HTTP 200.

==================================================

11. BUILD + RUNTIME

==================================================

Run:

`npm run build`

and resolve all broken imports/types caused by the migration.

Then perform real runtime tests for:

- text chat

- model switching

- image chat

- non-vision model rejection

- daily quota

- model-test diagnostics

- Workspaces

Do not merely remove UI elements and declare success.

The legacy architecture must actually be removed from the execution path.

==================================================

FINAL ARCHITECTURE

XCOMM is now a DIRECT MODEL ROUTING PLATFORM.

The selected model directly powers the response.

There is no hidden:

pulse-1

forge-1

cipher-1

execution layer.

Future XCOMM Agents may exist as a separate product capability, but they must not be confused with or reintroduced as the legacy model-routing mechanism.