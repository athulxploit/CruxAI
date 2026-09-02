# Multimodal Upgrade: REAL Image Input & Multi-turn Image Conversations

Upgrade XCOMM AI to support real end-to-end image understanding.

The feature must provide:

- Real image upload

- Real image transmission to the selected AI model

- Secure private storage

- Vision capability enforcement

- Multi-turn image conversations

- Image previews

- Clipboard paste

- Drag and drop

- Mobile image selection

- Correct model routing

- Existing daily quota compatibility

IMPORTANT:

Do NOT create a fake image-analysis layer.

Do NOT use OCR/text extraction as a replacement for actual image input.

Do NOT silently switch models when an image is attached.

The selected model must remain the model that processes the request when that model supports vision.

==================================================

1. DATABASE & STORAGE

==================================================

Reuse the existing `files` infrastructure where possible.

Do NOT create duplicate file-storage systems if the existing schema already supports attachments.

Ensure the `files` table stores appropriate image metadata, including where applicable:

- user_id

- conversation_id

- message_id

- storage path

- MIME type

- file size

- original filename

- image dimensions if available

- created_at

Use the existing private Supabase `user-files` bucket.

The bucket MUST remain private.

Do NOT make uploaded images publicly accessible.

Use short-lived signed URLs when the backend needs to provide an image to an external AI provider.

The backend must verify that the authenticated user owns the requested file before generating a signed URL.

Never expose permanent/public storage URLs.

==================================================

2. IMAGE LIMIT

==================================================

Maximum images per user message:

5 images.

The limit must be enforced server-side as well as in the UI.

If a user attempts to attach more than 5 images:

Reject the additional attachments and clearly inform the user.

Do not silently discard images.

==================================================

3. IMAGE VALIDATION

==================================================

Supported common image formats:

- PNG

- JPEG/JPG

- WEBP

- GIF where supported by the selected provider/model

Validate server-side:

- MIME type

- file size

- file integrity

- image dimensions

- maximum image count

Do not trust file extensions alone.

Reject unsupported or malformed files safely.

==================================================

4. MODEL REGISTRY

==================================================

Update:

`src/lib/model-registry.ts`

Add:

`supportsVision: boolean`

to `ModelEntry`.

IMPORTANT:

Do NOT mark models as vision-capable based on assumptions.

Populate `supportsVision` according to the actual provider/model capability.

The currently listed vision-capable models include:

- `gpt_54_mini`

- `gpt_55_terra`

- `claude_sonnet_5`

- `gpt_56_sol`

- `claude_opus_46`

Gemini models should continue using their existing provider capability mapping.

Also inspect the other currently registered XCOMM models and explicitly mark them:

`supportsVision: true`

or

`supportsVision: false`

based on the actual provider capability.

Do not silently assume unsupported models can process images.

==================================================

5. VISION ENFORCEMENT

==================================================

When the user attaches one or more images:

1. Identify the selected model.

2. Resolve its model registry entry.

3. Check `supportsVision`.

If:

`supportsVision = true`

→ continue normally.

If:

`supportsVision = false`

→ reject the request with:

"This model doesn't currently support image input. Please select a vision-capable model."

IMPORTANT:

DO NOT:

- switch models

- use a fallback model

- remove the image

- send only the text

- silently downgrade the request

The user must manually select a vision-capable model.

==================================================

6. BACKEND MULTIMODAL TRANSMISSION

==================================================

Update:

`src/routes/api/ai-stream.ts`

Update `ProxyBody` and `AIMessage` types to support multimodal content parts.

Support structures such as:

- text

- image_url

The backend must preserve the complete multimodal message.

Do NOT flatten image content into text.

Do NOT convert the image into an OCR-only representation.

When the selected model supports vision, transmit:

USER TEXT + ACTUAL IMAGE

to the selected provider.

For OpenRouter, use the provider-supported multimodal message format.

For Gemini, use the existing Gemini provider mapping and its supported image-input format.

==================================================

7. SIGNED URL RESOLUTION

==================================================

When an attachment references a private Supabase storage path such as:

`user-files/...`

the backend must:

1. Authenticate the current user.

2. Verify ownership of the file.

3. Generate a short-lived signed URL.

4. Pass that temporary URL to the selected provider.

5. Never expose a permanent public URL.

The signed URL should have the shortest practical lifetime that still allows the provider to retrieve the image.

Do not log signed URLs unnecessarily.

Do not expose signed URLs in analytics.

==================================================

8. UI CHAT COMPOSER

==================================================

Update:

`src/components/arch/chat-input.tsx`

Add image attachments without redesigning the existing XCOMM composer.

When an image is attached:

Show a compact thumbnail approximately:

72 × 72 px

Maintain aspect ratio and use an appropriate object-fit strategy.

Each thumbnail must have:

- image preview

- remove button

- upload state

The UI should remain clean and professional.

Do NOT create oversized image previews inside the composer.

==================================================

9. IMAGE PREVIEW INTERACTION

==================================================

Allow the user to click/tap a thumbnail to view a larger preview if appropriate.

The preview should not permanently alter the composer layout.

Closing the preview must return the user to the normal composer.

==================================================

10. CLIPBOARD

==================================================

Support:

Paste image from clipboard.

Example:

User copies a screenshot.

User presses:

Ctrl+V / Cmd+V

XCOMM detects the image and adds it as an attachment.

Do not interfere with normal text clipboard behavior.

If clipboard contains text only:

continue normal text paste behavior.

==================================================

11. DRAG & DROP

==================================================

Support dragging image files onto the chat composer.

When the user drags a supported image over the composer:

show a subtle drop-state indication.

When dropped:

upload/attach the image.

Reject unsupported files clearly.

Do not redesign the entire composer.

==================================================

12. MOBILE

==================================================

The existing XCOMM responsive design must remain intact.

On mobile, image selection should support the available device capabilities:

- photo library

- camera where the operating system/browser exposes it

- file picker

Do not reintroduce redundant attachment options that XCOMM intentionally removed.

Use the existing attachment/file architecture where possible.

==================================================

13. UPLOAD STATE

==================================================

When uploading:

Show an appropriate progress/loading state.

Do not allow a message to be submitted while required image uploads are still incomplete.

If upload fails:

- show an error

- allow retry/removal

- do not send an incomplete image message

==================================================

14. CHAT MESSAGE RENDERING

==================================================

Update:

`src/components/arch/chat-view.tsx`

Render attached images inside the user's message.

Example:

[ image thumbnail ]

"Analyze this architecture."

The image must remain associated with the message.

The assistant response should appear normally below.

Do not create a separate conversation for images.

==================================================

15. APP STORE / MESSAGE STATE

==================================================

Update:

`src/lib/app-store.ts`

Ensure the `Message` interface and message state correctly preserve attachment metadata.

Attachments should include sufficient information to reconstruct/render the image and provide the backend with its secure storage reference.

Do not store raw large image binaries in normal application state.

==================================================

16. MULTI-TURN IMAGE CONTEXT

==================================================

Support natural follow-up questions.

Example:

User:

[IMAGE]

"What is wrong with this?"

Assistant:

analysis

User:

"How would you fix the biggest issue?"

The second request must retain the appropriate image context.

Do NOT require the user to re-upload the image unnecessarily.

However:

Do NOT blindly resend every historical image forever.

Manage image context according to the selected model's context limitations and provider requirements.

Only include historical image references when they are relevant/needed for the conversation.

==================================================

17. MODEL ROUTING

==================================================

This is CRITICAL.

The existing strict model-selection system MUST remain unchanged.

Example:

User selects:

GPT-5.5

+ image

→ actual request must use:

`openai/gpt-5.5`

User switches to:

Claude Opus 4.6

+ image

→ actual request must use:

`anthropic/claude-opus-4.6`

Do NOT use a vision fallback model.

Do NOT route image requests through a different model.

The selected model must be verified through actual backend/provider metadata.

==================================================

18. STREAMING

==================================================

Image requests must continue using the existing XCOMM streaming architecture.

Expected flow:

Image upload

→ private storage

→ signed URL

→ selected model

→ multimodal inference

→ streamed response

→ XCOMM chat UI

Text-only requests must continue working exactly as before.

Do not break existing streaming behavior.

==================================================

19. DAILY MESSAGE QUOTA

==================================================

Do NOT modify the existing daily message quota architecture.

One submitted user request remains ONE daily message regardless of image count.

Examples:

Text only:

→ 1 message

1 image + text:

→ 1 message

5 images + text:

→ 1 message

The number of images must NOT create additional user-facing message charges.

Failed image requests must follow the existing quota rules.

If the selected provider rejects the request before successful generation, the message must not be incorrectly consumed.

==================================================

20. INTERNAL TOKEN/COST TRACKING

==================================================

Image requests may have different provider costs.

Continue tracking internal usage/cost information where supported.

Useful internal metadata may include:

- has_image

- image_count

- selected_model

- successful_request

- failed_request

- token usage

- provider response metadata where available

Do NOT create a separate user-facing image quota.

==================================================

21. SECURITY

==================================================

All image access must be scoped to the authenticated user.

Verify:

- authenticated user

- attachment ownership

- conversation ownership

- valid storage path

- valid MIME type

- allowed size

- allowed image count

- selected model capability

Prevent:

- cross-user image access

- arbitrary storage-path access

- public image exposure

- unauthorized signed URL generation

- client-side quota bypass

- API key exposure

The browser must never receive or store provider API keys.

==================================================

22. PRIVACY

==================================================

Images can contain sensitive information.

Treat image attachments with the same privacy protections as XCOMM conversation data.

Do not expose uploaded images publicly.

Do not send an image to any provider/model other than the one selected by the user.

Do not include private image URLs in logs unnecessarily.

==================================================

23. ERROR HANDLING

==================================================

Provide clear errors for:

- unsupported image type

- image too large

- image limit exceeded

- upload failure

- storage failure

- malformed image

- selected model does not support vision

- provider rejects image

- provider image-size limitation

- authentication failure

- authorization failure

Never silently change models.

Never silently remove the image and continue with text-only processing.

==================================================

24. ADMIN ANALYTICS

==================================================

Where the existing XCOMM analytics already track AI requests, record image usage appropriately.

Useful fields:

- has_image

- image_count

- model_used

- success/failure

- provider/model ID

Do NOT modify the existing daily quota system.

==================================================

25. VERIFICATION

==================================================

Perform REAL end-to-end tests.

TEST A — GPT-5.5 + IMAGE

Select:

GPT-5.5 Terra

Attach a real image.

Ask:

"Describe what you see in this image."

Verify:

- image uploaded

- image stored privately

- backend resolves attachment

- signed URL generated

- actual image sent to OpenRouter

- actual model ID = `openai/gpt-5.5`

- real response generated from the image

Do not consider the test passed merely because HTTP 200 was returned.

==================================================

TEST B — CLAUDE OPUS 4.6 + IMAGE

Select:

Claude Opus 4.6

Attach a real image.

Ask a question requiring actual visual analysis.

Verify:

- actual image transmitted

- actual model ID = `anthropic/claude-opus-4.6`

- response is generated by the selected model

==================================================

TEST C — MODEL SWITCH

Send:

GPT-5.5 + Image

Then switch to:

Claude Opus 4.6 + another Image

Verify that each request reaches the correct selected model.

Do not rely on response writing style.

Verify backend/provider metadata.

==================================================

TEST D — NON-VISION MODEL

Select a model whose registry capability is:

`supportsVision = false`

Attach an image.

Expected:

"This model doesn't currently support image input. Please select a vision-capable model."

Verify:

- no provider request is made

- no fallback occurs

- no image is silently removed

- no daily message is incorrectly consumed

==================================================

TEST E — MULTI-TURN

Send:

[image]

"What is this?"

Then:

"What is the most important issue shown here?"

Verify that the appropriate image context is retained.

==================================================

TEST F — MULTIPLE IMAGES

Attach 2–5 images in one message.

Verify:

- all images upload correctly

- all images reach the selected vision-capable model

- the model can distinguish between the images

- the request still counts as ONE daily message

==================================================

TEST G — IMAGE REMOVAL

Attach image.

Remove image.

Send text-only request.

Verify:

- removed image is not sent

- no stale attachment remains

- request behaves exactly like normal text chat

==================================================

TEST H — SECURITY

Attempt to access another user's attachment/storage path.

Expected:

ACCESS DENIED.

Verify that users cannot retrieve another user's private images.

==================================================

TEST I — FAILED PROVIDER REQUEST

Trigger a provider/image error where possible.

Verify that the existing daily quota rules remain correct.

==================================================

26. ACCEPTANCE CRITERIA

==================================================

[ ] Real image upload works

[ ] Image preview works

[ ] Image removal works

[ ] Clipboard paste works

[ ] Drag and drop works

[ ] Mobile image selection works where supported

[ ] Maximum 5 images per message

[ ] Server-side image validation exists

[ ] Private Supabase storage is used

[ ] Signed URLs are used for provider retrieval

[ ] Users cannot access another user's images

[ ] Actual image data reaches the selected vision-capable model

[ ] Text + image work together

[ ] Multiple images work where supported

[ ] Images render correctly in chat history

[ ] Multi-turn image context works

[ ] Selected model is strictly respected

[ ] No silent model fallback

[ ] Non-vision models reject image requests

[ ] Existing text chat remains functional

[ ] Existing streaming remains functional

[ ] Daily message quota remains unchanged

[ ] Image count does not create extra daily messages

[ ] Failed image requests follow existing quota rules

[ ] Admin analytics can identify image requests

[ ] API keys are never exposed to the browser

==================================================

27. IMPORTANT IMPLEMENTATION RULE

==================================================

Before creating new infrastructure, inspect the existing XCOMM:

- file table

- user-files bucket

- attachment system

- message schema

- model registry

- OpenRouter integration

- Gemini integration

- authentication

- RLS policies

Reuse existing infrastructure wherever possible.

Do not create duplicate storage or attachment systems.

==================================================

28. FINAL REPORT

==================================================

After implementation, provide:

1. Files changed.

2. Existing infrastructure reused.

3. New database/storage changes.

4. Exact image transmission architecture.

5. How signed URLs are generated and secured.

6. Which currently registered models support vision.

7. How unsupported models are handled.

8. How multi-turn image context works.

9. How image requests interact with daily quota.

10. Results of REAL end-to-end image tests.

11. Exact model IDs used during verification.

12. Security/RLS verification results.

13. Any models that cannot currently process images.

14. Any remaining limitations.

IMPORTANT:

Do not claim image understanding is working unless a REAL image was successfully transmitted to the selected model and the resulting response demonstrates actual visual understanding.