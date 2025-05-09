## 🔒 Privacy Policy

Your privacy is important. Here's how Tabvana handles your data:

*   **Data Collected & Stored (Locally on Your Computer):**
    *   **Settings:** User preferences such as Unsplash theme/quality, custom background URL or data URI from a local file, username (optional), preferred temperature unit, and selected search engine.
    *   **Unsplash API Key:** If provided, it is stored locally.
    *   **Bookmark Data:** Information about the categories you create/import and the bookmarks within them (titles, URLs, custom icons, favorite status).
    *   **Location Coordinates:** If you use the "Use My Current Location" feature, your latitude and longitude may be stored locally to fetch weather. This is only stored if you activate the feature.
*   **Purpose of Data Collection:** This data is collected solely to provide the features of the extension, such as personalizing the background, greeting you, displaying weather, remembering your layout preferences, managing your bookmarks within the extension, enabling search, and facilitating import/export of bookmarks.
*   **Data Usage & Storage:** All collected data is stored **locally** on your computer using the browser's standard `chrome.storage.local` API.
*   **Data Sharing:** Your data is **not shared** with any third parties. It remains on your local machine under your control. Network requests are made only to:
    *   Unsplash (if API key is provided and Unsplash background is active) to fetch background images.
    *   Google's favicon service (or directly to website servers via `topSites`) to retrieve website icons.
    *   Open-Meteo API (if location is set) to fetch weather forecasts.
    *   DuckDuckGo (if selected as search engine and typing in search bar) for search suggestions.
