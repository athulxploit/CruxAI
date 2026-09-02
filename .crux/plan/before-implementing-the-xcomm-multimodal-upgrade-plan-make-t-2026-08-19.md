Before implementing the XCOMM Multimodal Upgrade Plan, make these three corrections:

1. LOCAL PREVIEW LIFECYCLE

Do NOT immediately revoke `localUrl` as soon as the upload succeeds.

The correct lifecycle is:

localUrl

→ image displayed immediately

→ background upload

→ upload succeeds

→ obtain/resolve the persisted secure image URL

→ replace the temporary local preview with the persisted preview

→ only then revoke the old local object URL

The image must never disappear or become broken during this transition.

If the persisted signed URL cannot be resolved immediately, keep the local preview visible until it can be safely replaced.

Also clean up object URLs when an attachment is removed or the component is unmounted to prevent memory leaks.

2. IMAGE OPTIMIZATION

Do NOT treat 2048px as a universal provider/model vision limit.

Use 2048px only as a reasonable optimization target for extremely large images.

The implementation must:

- preserve aspect ratio

- preserve readability of screenshots/text

- avoid unnecessary compression

- avoid degrading already-small images

- respect the actual selected model/provider requirements where known

Do not resize an image unnecessarily just because it exceeds an arbitrary fixed limit.

3. PARALLEL UPLOADS

Do not use unlimited `Promise.all` concurrency.

Use controlled concurrent uploads, preferably around 2–3 simultaneous uploads.

Example with 5 images:

Image 1 → uploading

Image 2 → uploading

Image 3 → uploading

Then as one completes:

Image 4 → uploading

Then:

Image 5 → uploading

This should make multi-image uploads fast without creating an uncontrolled request burst.

Everything else in the supplied XCOMM Multimodal Upgrade Plan should remain unchanged.

Most importantly, preserve:

- instant local previews

- actual image rendering instead of filenames

- private Supabase storage

- secure signed URLs

- immediate non-vision warning

- strict model selection

- no automatic model fallback

- existing daily quota

- existing chat/streaming architecture