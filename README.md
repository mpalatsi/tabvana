# Tabvana - Your Personalized New Tab

Tabvana transforms your new tab page into a dynamic and customizable dashboard, putting your bookmarks, favorite sites, and a touch of inspiration right where you need them.

![Tabvana Screenshot 1](assets/screenshots/image.png)

## ✨ Features

*   **Icon-Based Bookmark Management:** Organize your bookmarks into customizable categories. View them as easy-to-recognize icons using website favicons. Titles are neatly displayed on a single line with an ellipsis for overflow.
*   **Favorites & Top Sites:** Access your most visited websites (`topSites`) and pin your favorite bookmarks for quick access on the main view.
*   **Collapsible Categories:** Keep your dashboard tidy by collapsing and expanding bookmark categories.
*   **Customizable Backgrounds:**
    *   **Dynamic Unsplash Backgrounds:** Personalize your new tab with beautiful backgrounds fetched from Unsplash. Requires a free Unsplash API key. Choose your preferred theme and quality.
    *   **Custom URL Background:** Set your own background image by providing a direct image URL.
    *   **Local File Background:** Choose an image file from your computer to use as a background.
*   **Time & Date Display:** Stay informed with the current time and date prominently displayed.
*   **Weather Display:**
    *   See the current temperature in your chosen unit (°C/°F) in the header.
    *   Click the weather display to view a more detailed forecast pop-out.
*   **Search Integration:** Quickly search the web using your preferred search engine directly from the new tab page, with auto-fill suggestions from DuckDuckGo and your local bookmarks/categories.
*   **Settings Panel:** Customize Tabvana through an accessible settings panel (cog icon):
    *   Manage Background settings (Unsplash API Key, Theme, Quality; Custom Image URL; Local Image File).
    *   Set your preferred username for greetings.
    *   Choose temperature units (°C/°F).
    *   Set your location for weather using the "Use My Current Location" button.
    *   Select your default search engine.
    *   Add, remove, rename, and manage bookmarks within categories.
    *   **Import/Export Bookmarks:**
        *   **Import from Browser:** Refresh Tabvana categories from selected browser bookmark folders. New bookmarks (by URL) are added to existing Tabvana categories (matched by name) or to newly created categories.
        *   **Export to Browser:** Push Tabvana categories and bookmarks into a "Tabvana Synced" folder within your browser's "Other Bookmarks". Existing browser bookmarks (by URL) in the target folders are skipped.

![Tabvana Screenshot 2](assets/screenshots/image2.png)
![Tabvana Screenshot 3](assets/screenshots/image3.png)

## 🚀 Installation & Usage

1.  **Download/Clone:** Get the extension code (e.g., clone the repository).
2.  **Browser Extensions Page:**
    *   **Chrome/Edge:** Open your browser, navigate to `chrome://extensions`.
    *   **Firefox:** Open Firefox, navigate to `about:debugging#/runtime/this-firefox`.
3.  **Enable Developer Mode (if applicable, typically for Chrome/Edge):** Ensure "Developer mode" is toggled on.
4.  **Load Extension:**
    *   **Chrome/Edge:** Click "Load unpacked" and select the extension's root directory (the one containing `manifest.json`).
    *   **Firefox:** Click "Load Temporary Add-on..." and select the `manifest.json` file from the project directory.
5.  **New Tab:** Open a new tab to see Tabvana in action!
6.  **Homepage (Optional):** You can also set your browser's homepage to the extension's new tab page if desired.

## ⚙️ Configuration

*   Access the settings panel using the cog icon (⚙️) typically located in one of the corners of the new tab page.
*   **Backgrounds:**
    *   To enable dynamic Unsplash backgrounds, obtain a free API key (Access Key) from [Unsplash Developers](https://unsplash.com/developers) and enter it in the settings panel.
    *   Alternatively, provide a direct image URL or choose a local image file for a custom background.
*   **Weather:** Use the "Use My Current Location" button in the Weather section of settings to allow the extension to fetch your local weather.

## 🔐 Permissions Explained

Tabvana requires the following permissions to function:

*   `bookmarks`: To read your bookmark tree (for import) and create/manage bookmarks (for export) in a designated "Tabvana Synced" folder.
*   `storage`: To save your settings locally (like API keys, theme preferences, category states, username, search engine choice, custom background URLs/data, and location coordinates).
*   `topSites`: To display your most frequently visited websites on the initial view.
*   `geolocation`: To determine your current location for fetching local weather, only when you explicitly use the "Use My Current Location" feature.
*   `tabs`: Used implicitly when opening bookmarks or search results in new tabs.

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

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

*(This README is generated based on project analysis and may require updates as the project evolves.)* 