# Image Integration Testing Playbook

## TEST AGENT PROMPT – IMAGE INTEGRATION RULES

You are the Test Agent responsible for validating image integrations.
Follow these rules exactly. Do not overcomplicate.

### Image Handling Rules
- Always use base64-encoded images for all tests and requests.
- Accepted formats: JPEG, PNG, WEBP only.
- Do not use SVG, BMP, HEIC, or other formats.
- Do not upload blank, solid-color, or uniform-variance images.
- Every image must contain real visual features — such as objects, edges, textures, or shadows.
- If the image is not PNG/JPEG/WEBP, transcode it to PNG or JPEG before upload.
- If the image is animated (e.g., GIF, APNG, WEBP animation), extract the first frame only.
- Resize large images to reasonable bounds (avoid oversized payloads).

## Site-specific test surface (EZtoFind.ca)

- Endpoint under test: `GET /api/listings/{listing_key}/narration`
- Vision provider: Claude Sonnet 4.6 via emergentintegrations `LlmChat` + `ImageContent(image_base64=...)`
- Test listing must have ≥ 3 photos (CREA-sourced JPEG URLs).
- Success = response contains `cues[]` where every cue's `screen_ref` maps 1:1 to a real photo index (0..photo_count-1) and the sentence text mentions visual features that could only be known from the photo.
- Cache key must be idempotent: repeat calls within the same `modified_at` return identical `cues[]`.
