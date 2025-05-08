# TODO: Port Firefox Extension to Chrome

This list outlines the necessary steps to port the Tabvana Firefox extension to Google Chrome.

## 1. `manifest.json` Modifications:

-   [x] **Remove Firefox-specific settings:**
    -   Delete the entire `browser_specific_settings` block:
        ```json
        "browser_specific_settings": {
          "gecko": {
            "id": "foxboard@mpalatsi",
            "strict_min_version": "109.0"
          }
        }
        ```
-   [x] **Review and Update `name`, `description`, and `version` (Optional but Recommended):**
    -   Consider if a different name or versioning scheme is desired for the Chrome version (e.g., "Tabvana for Chrome").
-   [ ] **Verify Permissions:**
    -   While `bookmarks`, `storage`, `tabs`, and `topSites` are generally compatible, double-check Chrome's documentation for any subtle differences in behavior or if any permissions need to be added or modified.
    -   Refer to: [Chrome Extension Permissions](https://developer.chrome.com/docs/extensions/mv3/declare_permissions/)
-   [ ] **Test `content_security_policy`:**
    -   Thoroughly test the extension in Chrome to ensure the current CSP doesn't cause issues. Adjust if necessary.
    -   Pay attention to `img-src` directives, especially `https://*.gstatic.com` if it was added for Firefox-specific Google services, as Chrome might handle these differently or not require them.
-   [ ] **Add `update_url` (for self-hosting outside Chrome Web Store - Optional):**
    -   If you plan to host the extension yourself, add an `update_url` field. This is not needed if publishing to the Chrome Web Store.
        ```json
        "update_url": "https://yourserver.com/updates.xml"
        ```

## 2. JavaScript API Modifications:

-   [x] **Replace `browser.*` with `chrome.*`:**
    -   Go through all `.js` files and replace instances of the `browser` namespace with `chrome`.
    -   **Affected files and APIs:**
        -   `components/unsplashBackground.js`:
            -   `browser.runtime.getURL` -> `chrome.runtime.getURL`
        -   `newtab.js`:
            -   `browser.storage.local.get` -> `chrome.storage.local.get`
            -   `browser.storage.local.set` -> `chrome.storage.local.set`
            -   `browser.bookmarks.getTree` -> `chrome.bookmarks.getTree`
            -   `browser.bookmarks.getSubTree` -> `chrome.bookmarks.getSubTree`
            -   `browser.topSites.get` -> `chrome.topSites.get`
        -   `components/bookmarkGrid.js` (comment update):
            -   Update comment: `browser.topSites.get()` -> `chrome.topSites.get()`
-   [x] **API Callbacks vs. Promises:**
    -   Firefox's `browser.*` APIs extensively use Promises. Chrome's `chrome.*` APIs traditionally used callbacks, but newer versions and Manifest V3 generally support Promises for many APIs.
    -   Verify if the `async/await` syntax used with `browser.*` APIs works directly with `chrome.*` equivalents. If not, you may need to refactor to use callbacks or wrap callback-based APIs in Promises.
    -   Example (if a Chrome API still uses callbacks):
        ```javascript
        // Old (Firefox with Promises)
        // const data = await browser.storage.local.get('key');

        // New (Chrome with callbacks, if Promises not supported for a specific API)
        // chrome.storage.local.get('key', (result) => {
        //   const data = result;
        //   // ... rest of your logic
        // });
        ```
    -   However, for `storage`, `bookmarks`, `runtime.getURL`, and `topSites`, Chrome's APIs do return Promises, so existing `async/await` code should largely remain compatible.

## 3. Testing and Debugging:

-   [ ] **Load Unpacked Extension in Chrome:** (In Progress)
-   [ ] **Thoroughly Test All Features:** (In Progress)
-   [ ] **Check for Console Errors:** (In Progress)
-   [ ] **Test in Different Chrome Versions (Optional but Recommended):**

## 4. Packaging and Distribution:

-   [ ] **Create a ZIP file for the Chrome Web Store:**
    -   Once testing is complete, package the extension directory into a `.zip` file.
-   [ ] **Chrome Web Store Developer Account:**
    -   You'll need a Chrome Web Store developer account to publish the extension.
-   [ ] **Review Chrome Web Store Policies:**
    -   Ensure your extension complies with all Chrome Web Store policies before submitting.

## 5. Documentation and Assets:

-   [ ] **Update `README.md`:**
    -   Mention Chrome compatibility.
    -   Provide instructions for installing/loading in Chrome.
-   [ ] **Update `LICENSE` (if needed):**
    -   Ensure the license is appropriate for distribution on the Chrome Web Store.
-   [ ] **Prepare Store Assets:**
    -   Screenshots, promotional tiles, and a detailed description for the Chrome Web Store listing.

Good luck with the porting process! 