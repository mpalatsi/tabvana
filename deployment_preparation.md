# Deployment Preparation To-Do List

**Manifest.json Finalization:**

*   [ ] Add unique extension `id` (e.g., `foxboard@yourdomain.com`).
*   [ ] Set initial `version` (e.g., `1.0.0`).
*   [ ] Add `developer` name (and optional URL).
*   [ ] Write clear `description`.
*   [ ] Verify/add required `icons` (16, 32, 48, 96, 128px).
*   [ ] Add `homepage_url` (Optional).
*   [ ] Add `support_url` (Optional).
*   [ ] Review `permissions` and `host_permissions` for minimality.
*   [ ] Define strict `content_security_policy`.

**Privacy Policy:**

*   [ ] Write privacy policy content:
    *   [ ] Detail data collected/stored (API key, settings).
    *   [ ] Explain purpose of data collection.
    *   [ ] State how data is used/stored (locally).
    *   [ ] Confirm data is not shared.
*   [ ] Host privacy policy on a public URL.
*   [ ] Add privacy policy URL to `manifest.json` (or provide during submission).

**Store Listing Assets & Info:**

*   [ ] Create high-quality screenshots.
*   [ ] Create promotional tile image (Optional).
*   [ ] Write detailed AMO store description.
*   [ ] Choose and specify a code `license`.

**Packaging & Linting:**

*   [ ] Install `web-ext` tool (`npm install --global web-ext`).
*   [ ] Run `web-ext lint` and fix all errors/warnings.
*   [ ] Prepare source code for upload (e.g., clean zip or public repo).
*   [ ] Run `web-ext build` to create the final package file (`.zip` or `.xpi`).

**Submission Process (AMO):**

*   [ ] Create AMO developer account.
*   [ ] Start new add-on submission.
*   [ ] Upload packaged file.
*   [ ] Upload/link source code.
*   [ ] Fill in all listing details (description, screenshots, privacy policy URL, license, etc.).
*   [ ] Provide justifications for requested permissions.
*   [ ] Submit for review.
*   [ ] Monitor for reviewer feedback and respond/update as needed. 