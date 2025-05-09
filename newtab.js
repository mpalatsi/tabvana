// No longer importing bookmarkGrid initially
// import { renderBookmarkGrid } from './components/bookmarkGrid.js';
import { setUnsplashBackground } from './components/unsplashBackground.js';

console.log('Tabvana newtab.js loaded');

// === Utility Functions (Define BEFORE use) ===

function formatTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    const strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}

function updateTime() {
    if (!timeDisplayElement) return;
    const now = new Date();
    timeDisplayElement.textContent = formatTime(now);
}

// Updated function to display current weather in the header
function updateCurrentWeatherDisplay(unit, currentWeatherData = null) {
    if (!weatherDisplayElement) return;
    let tempText;
    // TODO: Potentially add a weather icon here based on weather code

    if (currentWeatherData && typeof currentWeatherData.temperature !== 'undefined') {
        const temp = Math.round(currentWeatherData.temperature);
        tempText = `${temp}°${unit === 'imperial' ? 'F' : 'C'}`;
        // Here you could also update an icon using currentWeatherData.weathercode
        // e.g., weatherIconElement.className = getWeatherIconClass(currentWeatherData.weathercode);
    } else {
        // Fallback to placeholder text if no specific data is provided
        tempText = (unit === 'imperial') ? '--°F' : '--°C'; // More generic placeholder
    }
    weatherDisplayElement.textContent = tempText;
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return "Good morning";
    } else if (hour < 18) {
        return "Good afternoon";
    } else {
        return "Good evening";
    }
}

function displayGreeting(name) {
    if (!greetingDisplayElement) return;
    const greetingText = getGreeting();
    const personalizedGreeting = name ? `${greetingText}, ${name}.` : `${greetingText}.`;
    greetingDisplayElement.textContent = personalizedGreeting;
}

function clearMainContent() {
    // Only clear the bookmark grid container, leave the greeting (h2) alone.
    const bookmarkContainer = document.getElementById('bookmark-grid-container');
    if (bookmarkContainer) {
        bookmarkContainer.innerHTML = ''; // Clear previous bookmarks
    }

    // Remove the old category placeholder heading if it exists
    const categoryHeading = mainContentElement?.querySelector('#category-content-heading'); // Use optional chaining
    if (categoryHeading) {
        categoryHeading.remove();
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// === Logic to toggle favorite status === 
// MOVED EARLIER
async function handleToggleFavorite(categoryId, bookmarkId) {
  console.log(`[handleToggleFavorite] Attempting to toggle fav for CatID: ${categoryId}, BM ID: ${bookmarkId}`);
  let bookmarkFound = false;
  try {
    const category = tabvanaData.categories.find(c => c.id === categoryId);
    console.log(`[handleToggleFavorite] Found category:`, category);
    if (category && category.bookmarks) {
      const bookmark = category.bookmarks.find(b => b.id === bookmarkId);
      console.log(`[handleToggleFavorite] Found bookmark:`, bookmark);
      if (bookmark) {
        // Initialize isFavorite if it doesn't exist
        if (typeof bookmark.isFavorite === 'undefined') {
          bookmark.isFavorite = false;
        }
        bookmark.isFavorite = !bookmark.isFavorite; // Toggle status
        console.log(`[handleToggleFavorite] Bookmark "${bookmark.title}" favorite status set to: ${bookmark.isFavorite}`);
        bookmarkFound = true;

        // Re-render the current view (either initial or specific category)
        console.log("[handleToggleFavorite] Re-rendering view...");
        if (showingInitialView) {
            renderInitialView();
        } else if (selectedCategoryId === categoryId) {
            handleCategoryClick(categoryId); // Re-render the current category
        } else {
             console.warn("[handleToggleFavorite] Toggled favorite on a bookmark not in the current view.");
             // Optionally re-render initial view if it might be affected?
             // renderInitialView(); 
        }
         // Also re-render settings list if panel is open
        if (settingsPanel.classList.contains('visible') && selectedCategoryForManagement === categoryId) {
            renderBookmarkManagementList(categoryId);
        }
        console.log("[handleToggleFavorite] Saving data...");
        await saveData(); // Save the change
        console.log("[handleToggleFavorite] Data saved.");
      }
    }
  } catch (error) {
    console.error("[handleToggleFavorite] Error toggling favorite status:", error);
  }
  if (!bookmarkFound) {
    console.error(`[handleToggleFavorite] Could not find bookmark with ID ${bookmarkId} in category ${categoryId} to toggle favorite.`);
  }
  console.log("[handleToggleFavorite] Finished.");
}

// === Handle clicks within the main bookmark grid === 
function handleBookmarkGridClick(event) {
  const clickedItem = event.target.closest('.bookmark-item');
  
  if (!clickedItem) {
    return; // Click was outside a bookmark item
  }

  // If in edit mode, handle potential favorite toggle or prevent navigation
  if (isEditMode) {
    const favoriteButton = event.target.closest('.favorite-toggle-button');

    if (favoriteButton) {
      // Click was on the favorite button (only visible in edit mode now)
      event.preventDefault(); // Prevent link navigation
      const bookmarkId = clickedItem.dataset.bookmarkId;
      const categoryId = clickedItem.dataset.categoryId;
    if (bookmarkId && categoryId) {
      handleToggleFavorite(categoryId, bookmarkId);
    } else {
        console.warn("[handleBookmarkGridClick] Missing bookmarkId or categoryId on fav toggle in edit mode.");
      }
      return; // Action handled (favorite toggle)
    }

    // If click was on other parts of the bookmark item in edit mode (icon, title, etc.),
    // prevent default link navigation. Specific edit actions (icon/title edits)
    // are handled by other delegated listeners (handleGridEditClick, handleGridEditBlur).
    event.preventDefault(); 
    // console.log("[handleBookmarkGridClick] Preventing default link navigation for item click in edit mode.");
    return; // Prevent further processing of this click for navigation
  }

  // If NOT in edit mode, default behavior is to navigate. 
  // The favorite button is not visible, so no need to check for it here.
  // console.log("[handleBookmarkGridClick] Normal mode click, allowing default navigation.");
}

// === Helper to get all favorite bookmarks ===
// MOVED EARLIER
function getAllFavoriteBookmarks() {
  console.log("[getAllFavs] Starting..."); // Log start
  let favorites = []; 
  try {
      if (!Array.isArray(tabvanaData.categories)) {
          console.error("[getAllFavs] tabvanaData.categories is not an array!", tabvanaData.categories);
          return []; // Return empty array on error
      }
      tabvanaData.categories.forEach((category, index) => {
        console.log(`[getAllFavs] Processing category ${index}:`, category?.name);
        if (category && category.bookmarks && Array.isArray(category.bookmarks)) { // Add checks
          category.bookmarks.forEach((bookmark, bmIndex) => {
            // console.log(`[getAllFavs] Checking bookmark ${bmIndex}:`, bookmark?.title); // Optional: very verbose log
            if (bookmark && bookmark.isFavorite) { // Check if bookmark exists
              console.log(`[getAllFavs] Found favorite: ${bookmark.title}`);
              favorites.push({ ...bookmark, categoryId: category.id });
            }
          });
        } else {
            console.warn(`[getAllFavs] Category ${index} (${category?.name}) has missing or invalid bookmarks array.`);
        }
      });
  } catch (error) {
      console.error("[getAllFavs] Error during processing:", error);
      // Return empty array in case of unexpected errors
      return []; 
  }
  console.log("[getAllFavs] Finished, returning:", favorites);
  return favorites; 
}

// --- Constants & Defaults ---
const STORAGE_KEY = 'tabvanaData';
const defaultSettings = {
    unsplashApiKey: null,
    unsplashTheme: 'nature',
    unsplashQuality: 'Standard',
    userName: '',
    temperatureUnit: 'metric',
    searchEngine: 'duckduckgo',
    showTopSites: true,
    themeMode: 'dark', // Added new themeMode setting
    categories: [
        { id: 'work', name: 'Work', bookmarks: [] },
        { id: 'personal', name: 'Personal', bookmarks: [] }
    ] // Default categories
};

// --- Constants: Unsplash Topics ---
const UNSPLASH_TOPICS = [
  { value: 'wallpapers', name: 'Wallpapers (Default)' },
  { value: 'nature', name: 'Nature' },
  { value: 'textures-patterns', name: 'Textures & Patterns' },
  { value: 'architecture-interiors', name: 'Architecture' },
  { value: 'film', name: 'Film' },
  { value: 'street-photography', name: 'Street Photography' },
  { value: 'experimental', name: 'Experimental' },
  { value: 'animals', name: 'Animals' },
  { value: 'fashion-beauty', name: 'Fashion & Beauty' },
  { value: 'food-drink', name: 'Food & Drink' },
  { value: 'travel', name: 'Travel' },
  { value: 'people', name: 'People' },
  { value: 'spirituality', name: 'Spirituality' },
  { value: 'business-work', name: 'Business & Work' },
  { value: 'athletics', name: 'Athletics' },
  { value: 'health', name: 'Health' },
  { value: 'current-events', name: 'Current Events' },
  { value: 'technology', name: 'Technology' },
  { value: 'arts-culture', name: 'Arts & Culture' },
  // Add more popular/relevant ones if desired
];

// --- Constants: Search Engines ---
const SEARCH_ENGINES = {
    google: { name: 'Google', url: 'https://www.google.com/search?q={searchTerms}' },
    duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={searchTerms}' },
    bing: { name: 'Bing', url: 'https://www.bing.com/search?q={searchTerms}' },
    brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q={searchTerms}' },
    ecosia: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q={searchTerms}' },
    startpage: { name: 'Startpage', url: 'https://www.startpage.com/do/search?query={searchTerms}' }
};

// --- State ---
let tabvanaData = { ...defaultSettings }; // Initialize with defaults
let selectedCategoryId = null; // For main view
let showingInitialView = true; // Declare the variable here
let selectedCategoryForManagement = null; // For settings panel

// --- DOM Elements (Grouped for clarity) ---
// Main View Elements
let mainContentElement = null;
let categoryBarElement = null;
let backgroundContainerElement = null;
let timeDisplayElement = null;
let dateDisplayElement = null;
let weatherDisplayElement = null;
let greetingDisplayElement = null;
let bookmarkGridContainer = null;

// Settings Panel Elements
let settingsToggleButton = null;
let settingsPanel = null;
let settingsCloseButton = null;
let saveSettingsButton = null;
let fetchLocationButton = null; // Added for the location button

// Forecast Display Elements
let forecastDisplay = null;
let forecastContent = null;
let forecastCloseButton = null;

// Custom Background Elements
let customBackgroundUrlInput = null;
let setCustomBackgroundButton = null;
let clearCustomBackgroundButton = null;
let customBackgroundFileInput = null;
let chooseLocalFileButton = null;
let localFileNameDisplay = null;

// General Settings Inputs
let unsplashApiKeyInput = null;
let unsplashThemeSelect = null;
let unsplashQualitySelect = null;
let userNameInput = null;
let temperatureUnitSelect = null;
let searchEngineSelect = null;
let themeModeSelect = null; // Added reference for the new select

// Category Management Elements
let categoryManagementSection = null;
let categoryListElement = null;
let newCategoryNameInput = null;
let addCategoryButton = null;
let importFirefoxBookmarksButton = null;
let pushTabvanaBookmarksButton = null; // New button variable

// Bookmark Management Elements (Get references now)
let bookmarkManagementSection = null;
let bookmarkSectionTitle = null;
let bookmarkListElement = null;
let newBookmarkTitleInput = null;
let newBookmarkUrlInput = null;
let addBookmarkButton = null;
let backToCategoriesButton = null;

// --- Modal Elements ---
let importModalOverlay = null;
let importModal = null;
let importFolderList = null;
let importSelectAllButton = null;
let importSelectNoneButton = null;
let importConfirmButton = null;
let importCancelButton = null;

// --- Edit Mode State ---
let isEditMode = false;
let editModeToggleButton = null; // Will be assigned in renderCategoriesBar

// --- Search Elements ---
let searchForm = null;
let searchInput = null;
let searchSuggestionsContainer = null; // For auto-fill

let draggedItemData = null; // To store { categoryId, bookmarkId, originalIndex }

let currentView = 'initial'; // Keep track of current view state (initial, category, favorites, search)
let currentCategory = null; // Stores the currently selected category object if view is 'category'
let currentSearchResults = [];
let topSitesCache = [];

let categoryBarListenerAttached = false;
let processingCategoryBarClick = false; // <<< New flag

// Make the DOMContentLoaded async to use await for storage
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Tabvana DOM fully loaded and parsed');

  // --- Assign All DOM Elements ---
  assignDOMElements();

  if (!checkDOMElements()) {
    return; // Stop if essential elements are missing
  }

  // --- Load Data & Initialize UI ---
  await loadDataAndInitializeUI();

});

function assignDOMElements() {
  // Main View
  mainContentElement = document.getElementById('main-content');
  categoryBarElement = document.getElementById('category-bar');
  backgroundContainerElement = document.getElementById('background-container');
  timeDisplayElement = document.getElementById('time-display');
  dateDisplayElement = document.getElementById('date-display');
  weatherDisplayElement = document.getElementById('weather-display');
  greetingDisplayElement = document.getElementById('greeting-display');
  // Settings Toggle
  settingsToggleButton = document.getElementById('settings-toggle-button');
  settingsPanel = document.getElementById('settings-panel');
  settingsCloseButton = document.getElementById('settings-close-button');
  saveSettingsButton = document.getElementById('save-settings-button');
  fetchLocationButton = document.getElementById('fetch-location-button'); // Assign the button
  // General Settings
  unsplashApiKeyInput = document.getElementById('unsplash-api-key-input');
  unsplashThemeSelect = document.getElementById('unsplash-theme-select');
  unsplashQualitySelect = document.getElementById('unsplash-quality-select');
  userNameInput = document.getElementById('user-name-input');
  temperatureUnitSelect = document.getElementById('temperature-unit-select');
  searchEngineSelect = document.getElementById('search-engine-select');
  themeModeSelect = document.getElementById('theme-mode-select'); // Assign new DOM element
  // Category Management
  categoryManagementSection = document.getElementById('category-management-section');
  categoryListElement = document.getElementById('category-list');
  newCategoryNameInput = document.getElementById('new-category-name');
  addCategoryButton = document.getElementById('add-category-button');
  importFirefoxBookmarksButton = document.getElementById('import-firefox-bookmarks-button');
  pushTabvanaBookmarksButton = document.getElementById('push-tabvana-bookmarks-button'); // Assign new button
  // Bookmark Management
  bookmarkManagementSection = document.getElementById('bookmark-management-section');
  bookmarkSectionTitle = document.getElementById('bookmark-section-title');
  bookmarkListElement = document.getElementById('bookmark-list');
  newBookmarkTitleInput = document.getElementById('new-bookmark-title');
  newBookmarkUrlInput = document.getElementById('new-bookmark-url');
  addBookmarkButton = document.getElementById('add-bookmark-button');
  backToCategoriesButton = document.getElementById('back-to-categories-button');

  // --- Assign Modal Elements ---
  importModalOverlay = document.getElementById('import-modal-overlay');
  importModal = document.getElementById('import-modal');
  importFolderList = document.getElementById('import-folder-list');
  importSelectAllButton = document.getElementById('import-select-all-button');
  importSelectNoneButton = document.getElementById('import-select-none-button');
  importConfirmButton = document.getElementById('import-confirm-button');
  importCancelButton = document.getElementById('import-cancel-button');

  // --- Assign Forecast Display Elements ---
  forecastDisplay = document.getElementById('forecast-display');
  forecastContent = document.getElementById('forecast-content');
  forecastCloseButton = document.getElementById('forecast-close-button');

  // --- Assign Custom Background Elements ---
  customBackgroundUrlInput = document.getElementById('custom-background-url-input');
  setCustomBackgroundButton = document.getElementById('set-custom-background-button');
  clearCustomBackgroundButton = document.getElementById('clear-custom-background-button');
  customBackgroundFileInput = document.getElementById('custom-background-file-input');
  chooseLocalFileButton = document.getElementById('choose-local-file-button');
  localFileNameDisplay = document.getElementById('local-file-name-display');

  // --- Assign Edit Mode Elements ---
  // REMOVE assignment from here: editModeToggleButton = document.getElementById('edit-mode-category-button'); 

  // Initialize UI elements (make sure IDs match HTML)
  timeDisplayElement = document.getElementById('time-display');
  dateDisplayElement = document.getElementById('date-display');
  searchForm = document.getElementById('search-form');
  searchInput = document.getElementById('search-input');
  greetingDisplayElement = document.getElementById('greeting-display');
  bookmarkGridContainer = document.getElementById('bookmark-grid-container');
  searchSuggestionsContainer = document.getElementById('search-suggestions-container'); // Assign new DOM element
}

function checkDOMElements() {
  const elements = [
    mainContentElement, categoryBarElement, backgroundContainerElement, timeDisplayElement, 
    dateDisplayElement, weatherDisplayElement, greetingDisplayElement,
    settingsToggleButton, settingsPanel, settingsCloseButton, saveSettingsButton,
    unsplashApiKeyInput, unsplashThemeSelect, unsplashQualitySelect, userNameInput, temperatureUnitSelect,
    searchEngineSelect, themeModeSelect,
    categoryManagementSection, categoryListElement, newCategoryNameInput, addCategoryButton,
    importFirefoxBookmarksButton,
    bookmarkManagementSection, bookmarkSectionTitle, bookmarkListElement, newBookmarkTitleInput, newBookmarkUrlInput, addBookmarkButton, backToCategoriesButton,
    // --- Check Modal Elements ---
    importModalOverlay, importModal, importFolderList, importSelectAllButton, importSelectNoneButton, importConfirmButton, importCancelButton,
    // --- Check Edit Mode Elements ---
    // editModeToggleButton 
    searchForm, searchInput, searchSuggestionsContainer, // Check suggestion container
    // --- Check Forecast Display Elements ---
    forecastDisplay, forecastContent, forecastCloseButton, // Check forecast display elements
    // --- Check Custom Background Elements ---
    customBackgroundUrlInput, setCustomBackgroundButton, clearCustomBackgroundButton,
    customBackgroundFileInput, chooseLocalFileButton, localFileNameDisplay,
    pushTabvanaBookmarksButton // Check the new button
  ];
  if (elements.some(el => !el)) {
    console.error('One or more core page elements not found! Check IDs.');
    return false;
  }
  // Check category bar element separately, as edit button depends on it
  if (!categoryBarElement) {
      console.error('Category bar element (#category-bar) not found! Cannot add buttons.');
    return false;
  }
  return true;
}

async function loadDataAndInitializeUI() {
  try {
    const storedData = await chrome.storage.local.get(STORAGE_KEY);
    tabvanaData = {
      ...defaultSettings,
      ...(storedData[STORAGE_KEY] || {}),
      searchEngine: storedData[STORAGE_KEY]?.searchEngine || defaultSettings.searchEngine,
      showTopSites: (storedData[STORAGE_KEY]?.showTopSites !== undefined) ? storedData[STORAGE_KEY].showTopSites : defaultSettings.showTopSites,
      themeMode: storedData[STORAGE_KEY]?.themeMode || defaultSettings.themeMode, // Load themeMode
      categories: (storedData[STORAGE_KEY]?.categories || defaultSettings.categories),
      customBackgroundUrl: storedData[STORAGE_KEY]?.customBackgroundUrl || null, // Load custom background URL
      customBackgroundDataUri: storedData[STORAGE_KEY]?.customBackgroundDataUri || null // Load custom background data URI
    };
    console.log('[Tabvana] Data loaded:', tabvanaData);
  } catch (error) {
    console.error('Error loading data from storage:', error);
    tabvanaData = { ...defaultSettings };
  }

  populateUnsplashThemeDropdown();
  populateSearchEngineDropdown();

  if (unsplashApiKeyInput) unsplashApiKeyInput.value = tabvanaData.unsplashApiKey || '';
  if (unsplashThemeSelect) unsplashThemeSelect.value = tabvanaData.unsplashTheme || defaultSettings.unsplashTheme;
  if (unsplashQualitySelect) unsplashQualitySelect.value = tabvanaData.unsplashQuality;
  if (userNameInput) userNameInput.value = tabvanaData.userName;
  if (temperatureUnitSelect) temperatureUnitSelect.value = tabvanaData.temperatureUnit;
  if (searchEngineSelect) searchEngineSelect.value = tabvanaData.searchEngine;
  if (themeModeSelect) themeModeSelect.value = tabvanaData.themeMode; // Initialize themeMode select
  if (customBackgroundUrlInput) customBackgroundUrlInput.value = tabvanaData.customBackgroundUrl || ''; // Initialize custom background input

  // Apply background based on loaded settings (custom, Unsplash, or default)
  await applyBackground(); 
  // if (backgroundContainerElement && typeof setUnsplashBackground === 'function') { // OLD CALL
  //   setUnsplashBackground(backgroundContainerElement, tabvanaData.unsplashApiKey, tabvanaData.unsplashTheme, tabvanaData.unsplashQuality);
  // }
  
  applyThemeMode(tabvanaData.themeMode); // Apply theme on load

  if (typeof renderCategoryManagementList === 'function') renderCategoryManagementList();
  if (typeof displayGreeting === 'function') displayGreeting(tabvanaData.userName);
  if (typeof updateTime === 'function') {
  updateTime();
  setInterval(updateTime, 1000 * 30);
  }
  if (typeof updateDate === 'function') updateDate();
  // Initialize header weather display (will use placeholder initially)
  if (typeof updateCurrentWeatherDisplay === 'function') updateCurrentWeatherDisplay(tabvanaData.temperatureUnit);
  // Attempt to load actual weather for the header if location is known
  if (typeof refreshWeatherHeader === 'function') refreshWeatherHeader();

  console.log('[Tabvana] Basic UI setup done. Rendering dynamic elements.');
  
  // Render category bar (which now also creates and assigns editModeToggleButton)
  if (typeof renderCategoriesBar === 'function') {
    renderCategoriesBar(); 
  } else {
    console.error('[Tabvana] renderCategoriesBar function is not defined! Cannot proceed.');
    return; // Stop if critical render function missing
  }
  
  // Setup event listeners AFTER the category bar (including the edit button) is created.
  if (typeof setupEventListeners === 'function') {
      setupEventListeners();
  } else {
       console.error('[Tabvana] setupEventListeners function is not defined! Cannot proceed.');
       return;
  }

  // Fetch Top Sites and Render Initial View
  currentView = 'initial';
  selectedCategoryId = null;
  currentCategory = null;
    showingInitialView = true;
  topSitesCache = [];
  try {
    if (tabvanaData.showTopSites && typeof chrome.topSites?.get === 'function') { 
      topSitesCache = await chrome.topSites.get();
      console.log("[Tabvana] Fetched top sites into cache:", topSitesCache.length);
  } else {
      console.log("[Tabvana] Top sites not shown or API not available.");
    }
  } catch (error) {
    console.error('[Tabvana] Error fetching top sites:', error);
    topSitesCache = []; 
  }

  if (typeof renderCurrentView === 'function') {
    renderCurrentView(); // Render the initial grid content
  } else {
    console.error('[Tabvana] renderCurrentView function is not defined!');
  }
  
  console.log('[Tabvana] loadDataAndInitializeUI finished.');
}

function setupEventListeners() {
  // Settings Panel Toggle
  settingsToggleButton.addEventListener('click', toggleSettingsPanel);
  settingsCloseButton.addEventListener('click', toggleSettingsPanel);
  // Save All Settings
  saveSettingsButton.addEventListener('click', handleSaveSettings);
  // Fetch Location
  if (fetchLocationButton) { // Add event listener for the new button
    fetchLocationButton.addEventListener('click', handleFetchLocation);
  }
  // Category Management
  addCategoryButton.addEventListener('click', handleAddCategory);
  importFirefoxBookmarksButton.addEventListener('click', handleImportBookmarks);
  if (pushTabvanaBookmarksButton) { // Add listener for push button
    pushTabvanaBookmarksButton.addEventListener('click', handlePushBookmarksToBrowser);
  }
  // Bookmark Management
  addBookmarkButton.addEventListener('click', handleAddBookmark);
  backToCategoriesButton.addEventListener('click', showCategoryManagement);

  // Weather Display Click
  if (weatherDisplayElement) {
    weatherDisplayElement.addEventListener('click', handleWeatherDisplayClick);
  }

  // Forecast Close Button
  if (forecastCloseButton) {
    forecastCloseButton.addEventListener('click', hideForecast);
  }

  // --- Search Form Submission ---
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', handleSearchSubmit);
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown); // For keyboard navigation
    searchInput.addEventListener('blur', () => { 
      // Delay hiding to allow click on suggestion to register
      setTimeout(() => searchSuggestionsContainer.style.display = 'none', 150);
    });
    searchSuggestionsContainer.addEventListener('mousedown', (event) => {
      // Prevent blur event on searchInput if click is on a suggestion item
      event.preventDefault();
    });
  } else {
    console.warn("Search form elements not found, cannot add submit listener.");
  }
  // --- End Search Form Submission ---

  // --- Modal Event Listeners ---
  importCancelButton.addEventListener('click', closeModal);
  importModalOverlay.addEventListener('click', (event) => { // Close if clicking overlay
      if (event.target === importModalOverlay) {
          closeModal();
      }
  });
  importSelectAllButton.addEventListener('click', () => selectAllImportCheckboxes(true));
  importSelectNoneButton.addEventListener('click', () => selectAllImportCheckboxes(false));
  importConfirmButton.addEventListener('click', handleConfirmImportSelection);
  // --- End Modal Listeners ---

  // --- Category Bar Listener (handles Home, Categories, AND Edit Mode) ---
  if (categoryBarElement && !categoryBarListenerAttached) {
  categoryBarElement.addEventListener('click', (event) => {
      console.log(`[Category Bar Listener] Click detected. Target: ${event.target.id || event.target.tagName}, Time: ${event.timeStamp}`);
      
      // Check if already processing a click
      if (processingCategoryBarClick) {
          console.warn('[Category Bar Listener] Already processing a click, ignoring re-entrant event.');
          return;
      }
      processingCategoryBarClick = true; // Set flag

    const clickedElement = event.target;

      try { // Use try/finally to ensure flag is reset
          // Explicitly check for the Edit Mode Button by its ID
          const editButtonTarget = clickedElement.closest('#edit-mode-category-button');
          if (editButtonTarget) {
              console.log("[Category Bar Listener] Edit Mode button identified by ID.");
              event.preventDefault(); 
              event.stopPropagation(); 
              toggleEditMode();
              // No return here, let it fall through to finally
          } else {
            // Check for Home button click by ID
            const homeButtonTarget = clickedElement.closest('#home-category-button');
            if (homeButtonTarget) { 
                console.log("[Category Bar Listener] Home button identified by ID.");
                event.preventDefault(); 
                event.stopPropagation(); 
        if (!showingInitialView) { 
            renderInitialView();
                }
                // No return here
            } else {
              // Check for Category button click using data attribute
              const categoryButtonTarget = clickedElement.closest('.category-item[data-category-id]');
              if (categoryButtonTarget) {
                  const categoryId = categoryButtonTarget.dataset.categoryId;
                  console.log(`[Category Bar Listener] Category button identified by data-attribute: ${categoryId}`);
                  event.preventDefault(); 
                  event.stopPropagation(); 
                  if (selectedCategoryId !== categoryId || showingInitialView) { 
             handleCategoryClick(categoryId);
        }
                  // No return here
    } else {
                // If click wasn't on any known interactive element inside the bar
                console.log("[Category Bar Listener] Click was not on a recognized button target.");
              }
            } 
          }
      } finally {
         processingCategoryBarClick = false; // Reset flag in finally block
         console.log(`[Category Bar Listener] Finished processing click. Time: ${event.timeStamp}`);
      }
    });
    categoryBarListenerAttached = true;
    console.log('[Tabvana Setup] Added DELEGATED click listener to categoryBarElement.');
  } else if (categoryBarElement && categoryBarListenerAttached) {
    console.log('[Tabvana Setup] Category bar listener ALREADY ATTACHED.');
  } else {
    console.error('[Tabvana Setup] Category bar element not found for listener!');
  }

  // --- Bookmark Grid Container Listener ---
  if (bookmarkGridContainer) {
    bookmarkGridContainer.addEventListener('click', handleBookmarkGridClick); 
    console.log('[Tabvana Setup] Added click listener to bookmarkGridContainer.');
  } else {
    console.warn('[Tabvana Setup] Bookmark grid container NOT found for listener.');
  }

  // --- Edit Mode Toggle Listener ---
  // Now that renderCategoriesBar has run, editModeToggleButton should be assigned.
  if (editModeToggleButton) {
      editModeToggleButton.addEventListener('click', toggleEditMode);
      console.log('[Tabvana Setup] Added listener to Edit Mode button.');
  } else {
      // This error might occur if renderCategoriesBar failed silently
      console.error('[Tabvana Setup] Edit Mode button not found! Listener not attached.');
  }

  // Custom Background Buttons
  if (setCustomBackgroundButton) {
    setCustomBackgroundButton.addEventListener('click', handleSetCustomBackground);
  }
  if (clearCustomBackgroundButton) {
    clearCustomBackgroundButton.addEventListener('click', handleClearCustomBackground);
  }
  // Local File Chooser
  if (chooseLocalFileButton && customBackgroundFileInput) {
      chooseLocalFileButton.addEventListener('click', (event) => {
          event.preventDefault(); // Prevent default button behavior
          event.stopPropagation(); // Stop the event from bubbling
          console.log('Choose file button clicked, programmatically clicking input...'); // Added for debugging
          customBackgroundFileInput.click(); // Trigger the hidden file input
      });
      customBackgroundFileInput.addEventListener('change', handleFileSelected);
  }
}

// === Search Functionality ===
function handleSearchSubmit(event) {
    event.preventDefault(); // Prevent default page reload
    const query = searchInput.value.trim();

    if (!query) {
        console.log("Search query is empty.");
        return; // Don't search if input is empty
    }

    const engineKey = tabvanaData.searchEngine; // Get from loaded data
    const engine = SEARCH_ENGINES[engineKey];

    if (engine) {
        const searchUrl = engine.url.replace('{searchTerms}', encodeURIComponent(query));
        console.log(`Performing search with ${engine.name}: ${searchUrl}`);
        // Redirect the current tab to the search results page
        window.location.href = searchUrl;
    } else {
        console.error(`Selected search engine key "${engineKey}" not found in SEARCH_ENGINES.`);
        // Optionally, fallback to a default engine or show an error
        alert(`Error: Could not find settings for search engine: ${engineKey}`);
    }
  searchInput.value = ''; // Clear search input after submission
  searchSuggestionsContainer.style.display = 'none'; // Hide suggestions
}

// --- NEW: Search Auto-fill Logic ---
let suggestionSources = [];
let activeSuggestionIndex = -1;
let debounceTimer = null; // For debouncing API calls

function generateSuggestionSources() {
  const sources = new Set(); // Use a Set to avoid duplicates

  // 1. Category Names
  tabvanaData.categories.forEach(category => {
    if (category.name) sources.add(category.name.toLowerCase());
    // 2. Bookmark Titles within categories
    if (category.bookmarks) {
      category.bookmarks.forEach(bookmark => {
        if (bookmark.title) sources.add(bookmark.title.toLowerCase());
      });
    }
  });

  // 3. Top Sites Titles (if available and enabled)
  if (tabvanaData.showTopSites && topSitesCache && topSitesCache.length > 0) {
    topSitesCache.forEach(site => {
      if (site.title) sources.add(site.title.toLowerCase());
    });
  }
  suggestionSources = Array.from(sources);
  console.log('[Tabvana] Suggestion sources generated:', suggestionSources.length);
}

async function handleSearchInput(event) { // Made async to use await for fetch
  const query = event.target.value.toLowerCase().trim();
  
  // Clear previous debounce timer
  clearTimeout(debounceTimer);

  if (query.length < 1) { // Minimum characters to trigger suggestions
    searchSuggestionsContainer.style.display = 'none';
    searchSuggestionsContainer.innerHTML = '';
    activeSuggestionIndex = -1;
    return;
  }

  // Ensure local suggestionSources is populated
  if (suggestionSources.length === 0) {
    generateSuggestionSources();
  }

  const localSuggestions = suggestionSources.filter(source => source.includes(query));

  // Debounce the API call
  debounceTimer = setTimeout(async () => {
    let webSuggestions = [];
    if (query.length > 0) { // Only fetch if query is not empty after debounce
      try {
        // Ask background script to fetch DDG suggestions
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { action: "fetchDdgSuggestions", query: query },
            (messageResponse) => {
              if (chrome.runtime.lastError) {
                // Handle errors like the background script not being available
                console.error('[Tabvana] Error sending message to background:', chrome.runtime.lastError.message);
                resolve({ success: false, error: chrome.runtime.lastError.message });
                return;
              }
              resolve(messageResponse);
            }
          );
        });

        if (response && response.success && response.data) {
          webSuggestions = response.data.map(item => item.phrase.toLowerCase());
          console.log('[Tabvana] DDG Suggestions from background:', webSuggestions);
        } else {
          console.warn('[Tabvana] Failed to fetch DDG suggestions via background or no data:', response ? response.error : 'No response');
        }
      } catch (error) {
        // This catch might be for errors in processing the response, 
        // or if the Promise from sendMessage itself rejects (less common with callback pattern)
        console.error('[Tabvana] Error processing DDG suggestions response from background:', error);
      }
    }

    // Combine local and web suggestions, ensuring uniqueness and limiting total
    const combined = new Set([...localSuggestions, ...webSuggestions]);
    const finalSuggestions = Array.from(combined).slice(0, 10); // Limit to 10 total suggestions

    displaySuggestions(finalSuggestions);
  }, 300); // 300ms debounce delay
}

function displaySuggestions(suggestions) {
  searchSuggestionsContainer.innerHTML = ''; // Clear previous suggestions
  if (suggestions.length === 0) {
    searchSuggestionsContainer.style.display = 'none';
    activeSuggestionIndex = -1;
    return;
  }

  suggestions.forEach((suggestionText, index) => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = suggestionText;
    // Capitalize first letter for display (optional)
    item.textContent = suggestionText.charAt(0).toUpperCase() + suggestionText.slice(1);

    item.addEventListener('click', () => {
      searchInput.value = item.textContent; // Use the displayed (capitalized) text
      searchSuggestionsContainer.style.display = 'none';
      searchSuggestionsContainer.innerHTML = '';
      activeSuggestionIndex = -1;
      searchForm.requestSubmit(); // Programmatically submit the form
    });
    searchSuggestionsContainer.appendChild(item);
  });
  searchSuggestionsContainer.style.display = 'block';
  activeSuggestionIndex = -1; // Reset active suggestion index
}

function handleSearchKeydown(event) {
  const items = searchSuggestionsContainer.querySelectorAll('.suggestion-item');
  if (items.length === 0 || searchSuggestionsContainer.style.display === 'none') return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
    updateActiveSuggestion(items);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
    updateActiveSuggestion(items);
  } else if (event.key === 'Enter') {
    if (activeSuggestionIndex > -1 && items[activeSuggestionIndex]) {
      event.preventDefault(); // Prevent form submit if we are selecting a suggestion
      items[activeSuggestionIndex].click(); // Simulate click on the active suggestion
    } 
    // If no suggestion is active, Enter will submit the form normally (handled by form submit event)
  } else if (event.key === 'Escape') {
    searchSuggestionsContainer.style.display = 'none';
    activeSuggestionIndex = -1;
  }
}

function updateActiveSuggestion(items) {
  items.forEach((item, index) => {
    if (index === activeSuggestionIndex) {
      item.classList.add('active-suggestion');
      // Optional: Scroll into view
      item.scrollIntoView({ block: 'nearest' });
      searchInput.value = item.textContent; // Update search bar as user navigates
    } else {
      item.classList.remove('active-suggestion');
    }
  });
}
// --- END: Search Auto-fill Logic ---

// --- Data Persistence ---
async function saveData() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: tabvanaData });
    console.log('Data saved successfully.');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// --- Category Bar Rendering (Bottom Bar) ---
function renderCategoriesBar() {
  if (!categoryBarElement) {
      console.error("[Tabvana] Cannot render category bar: element not found.");
      return;
  }
  categoryBarElement.innerHTML = ''; 

  // --- Add Home Button ---
  const homeButton = document.createElement('button');
  homeButton.className = 'category-item home-button'; // Add 'home-button' class
  homeButton.id = 'home-category-button'; // Specific ID
  // homeButton.innerHTML = '&#8962;'; // Remove Unicode character
  homeButton.title = 'Show Home View (Favorites & Top Sites)';

  // Create and add image tag
  const homeIcon = document.createElement('img');
  homeIcon.src = 'assets/icons/home.png';
  homeIcon.alt = 'Home';
  homeIcon.className = 'home-button-icon'; // Add class for styling
  homeButton.appendChild(homeIcon);

  // Add active class if showing initial view
  if (showingInitialView) { 
      homeButton.classList.add('active');
  }
  categoryBarElement.appendChild(homeButton);
  // --- End Home Button ---

  tabvanaData.categories.forEach(category => {
    const categoryElement = document.createElement('button');
    categoryElement.className = 'category-item';
    categoryElement.textContent = category.name;
    categoryElement.dataset.categoryId = category.id;
    // Add active class if needed
    if (category.id === selectedCategoryId) {
      categoryElement.classList.add('active');
    }
    categoryBarElement.appendChild(categoryElement);
  });

  // --- Add Edit Mode Toggle Button ---
  const editButton = document.createElement('button');
  editButton.className = 'category-item edit-mode-button';
  editButton.id = 'edit-mode-category-button';
  editButton.title = 'Toggle Edit Mode';

  const editIcon = document.createElement('img');
  editIcon.src = 'assets/icons/pencil.png';
  editIcon.alt = 'Edit';
  editIcon.className = 'edit-mode-button-icon';
  
  editButton.appendChild(editIcon);
  categoryBarElement.appendChild(editButton);
  
  // Assign the created button to the global variable HERE
  editModeToggleButton = editButton; 
  console.log('[Tabvana] Edit mode button created and assigned.');
  // --- End Edit Mode Button ---
}

// --- Settings Panel UI Rendering ---
function renderCategoryManagementList() {
  if (!categoryListElement) return;
  categoryListElement.innerHTML = ''; // Clear list

  tabvanaData.categories.forEach(category => {
    const li = document.createElement('li');
    li.dataset.categoryId = category.id;

    // Div for the category name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'category-name';
    nameDiv.textContent = category.name;

    // Div for the controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'category-item-controls';

    // Manage Bookmarks Button
    const manageButton = document.createElement('button');
    manageButton.textContent = 'Bookmarks';
    manageButton.title = 'Manage Bookmarks';
    manageButton.className = 'manage-bookmarks-button';
    manageButton.onclick = () => showBookmarkManagement(category.id);

    // Edit Button (Placeholder)
    const editButton = document.createElement('button');
    editButton.textContent = 'Rename';
    editButton.title = 'Rename Category';
    editButton.className = 'edit-category-button';
    editButton.onclick = () => handleRenameCategory(category.id);

    // Delete Button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.title = 'Delete Category';
    deleteButton.className = 'delete-category-button';
    deleteButton.onclick = () => handleDeleteCategory(category.id);

    controlsDiv.appendChild(manageButton);
    controlsDiv.appendChild(editButton);
    controlsDiv.appendChild(deleteButton);

    li.appendChild(nameDiv); // Add name div first
    li.appendChild(controlsDiv); // Add controls div second
    categoryListElement.appendChild(li);
  });
}

// --- Settings Panel Logic ---
function toggleSettingsPanel() {
  if (settingsPanel) {
    settingsPanel.classList.toggle('visible');
    if (!settingsPanel.classList.contains('visible')) {
      // When closing, always show category management view first next time
      showCategoryManagement(); 
    }
    // Pre-fill inputs only when opening
    else if (settingsPanel.classList.contains('visible')) {
      prefillSettingsInputs();
    }
  }
}

// Helper to prefill settings
async function prefillSettingsInputs() {
  try {
    const storedData = await chrome.storage.local.get(STORAGE_KEY);
    const currentData = {
        ...defaultSettings, 
        ...(storedData[STORAGE_KEY] || {}),
        // Ensure searchEngine is included when prefilling
        searchEngine: storedData[STORAGE_KEY]?.searchEngine || defaultSettings.searchEngine,
        themeMode: storedData[STORAGE_KEY]?.themeMode || defaultSettings.themeMode, // Load themeMode for prefill
        customBackgroundUrl: storedData[STORAGE_KEY]?.customBackgroundUrl || null, // Load custom background URL
        customBackgroundDataUri: storedData[STORAGE_KEY]?.customBackgroundDataUri || null // Load custom background data URI
    };
    unsplashApiKeyInput.value = currentData.unsplashApiKey || '';
    unsplashThemeSelect.value = currentData.unsplashTheme || defaultSettings.unsplashTheme;
    unsplashQualitySelect.value = currentData.unsplashQuality;
    userNameInput.value = currentData.userName;
    temperatureUnitSelect.value = currentData.temperatureUnit;
    searchEngineSelect.value = currentData.searchEngine;
    if (themeModeSelect) themeModeSelect.value = currentData.themeMode; // Prefill themeMode select
  } catch (err) { console.error('Error getting settings for panel:', err) };
}

// --- Fetch Location Logic ---
async function handleFetchLocation() {
  const locationDisplay = document.getElementById('location-display');
  if (!locationDisplay) {
    console.error('Location display element not found.');
    return;
  }

  locationDisplay.textContent = 'Fetching location...';

  if (!navigator.geolocation) {
    locationDisplay.textContent = 'Geolocation is not supported by your browser.';
    return;
  }

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
    });

    const { latitude, longitude } = position.coords;
    locationDisplay.textContent = `Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`;

    // Store the location and update weather if enabled
    tabvanaData.latitude = latitude;
    tabvanaData.longitude = longitude;
    await saveData(); // Save updated coordinates
    refreshWeatherHeader(true); // Refresh header weather with new location

    // Optionally, trigger a weather update if weather is enabled
    // This depends on how weather updates are handled elsewhere. 
    // For now, we'll assume it might be part of a larger save/refresh cycle or a separate function call.
    console.log('Location fetched and saved:', { latitude, longitude });
    // Example: if (tabvanaData.weatherEnabled) { fetchWeather(latitude, longitude); }

  } catch (error) {
    console.error('Error fetching location:', error);
    if (error.code === error.PERMISSION_DENIED) {
      locationDisplay.textContent = 'Location permission denied.';
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      locationDisplay.textContent = 'Location information is unavailable.';
    } else if (error.code === error.TIMEOUT) {
      locationDisplay.textContent = 'Location request timed out.';
    } else {
      locationDisplay.textContent = 'Error fetching location.';
    }
    // Clear stored coordinates if fetching failed
    delete tabvanaData.latitude;
    delete tabvanaData.longitude;
    await saveData(); // Save the cleared coordinates
    updateCurrentWeatherDisplay(tabvanaData.temperatureUnit); // Revert to placeholder if location fails
  }
}

// === Category & Bookmark Management Logic (Settings Panel) ===
function handleAddCategory() {
  const name = newCategoryNameInput.value.trim();
  if (!name) {
    alert('Please enter a category name.');
    return;
  }

  const newCategory = {
    id: generateId(),
    name: name,
    bookmarks: []
  };

  tabvanaData.categories.push(newCategory);
  newCategoryNameInput.value = ''; // Clear input
  renderCategoryManagementList(); // Re-render list in settings
  renderCategoriesBar(); // Re-render bottom bar
  saveData(); // Persist changes
}

function handleDeleteCategory(categoryId) {
  const category = tabvanaData.categories.find(c => c.id === categoryId);
  if (!category) return;

  // Confirmation
  if (!confirm(`Are you sure you want to delete the category "${category.name}" and all its bookmarks?`)) {
    return;
  }

  tabvanaData.categories = tabvanaData.categories.filter(c => c.id !== categoryId);
  renderCategoryManagementList();
  renderCategoriesBar();
  saveData();
}

// TODO: handleRenameCategory
function handleRenameCategory(categoryId) {
    const category = tabvanaData.categories.find(c => c.id === categoryId);
    if (!category) return;

    const newName = prompt(`Enter new name for category "${category.name}":`, category.name);

    // Check if user cancelled or entered empty name (though prompt usually returns empty string, not null on empty submit)
    if (newName === null) {
        return; // User cancelled
    }
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert("Category name cannot be empty.");
        return;
    }
    
    if (trimmedName === category.name) {
        return; // No change
    }

    // Update the name
    category.name = trimmedName;

    // Re-render UI elements
    renderCategoryManagementList(); // Update list in settings
    renderCategoriesBar(); // Update bottom bar

    // Save changes
    saveData();
}

function showCategoryManagement() {
  categoryManagementSection.style.display = 'block';
  bookmarkManagementSection.style.display = 'none';
  selectedCategoryForManagement = null;
}

function showBookmarkManagement(categoryId) {
  selectedCategoryForManagement = categoryId;
  const category = tabvanaData.categories.find(c => c.id === categoryId);
  if (!category) return;

  categoryManagementSection.style.display = 'none';
  bookmarkManagementSection.style.display = 'block';
  bookmarkSectionTitle.textContent = `Manage Bookmarks in "${category.name}"`;

  renderBookmarkManagementList(categoryId);
}

function renderBookmarkManagementList(categoryId) {
    const category = tabvanaData.categories.find(c => c.id === categoryId);
    if (!category || !bookmarkListElement) {
        bookmarkListElement.innerHTML = '<p>Error: Category not found.</p>';
        return;
    }

    bookmarkListElement.innerHTML = ''; // Clear previous list

    if (!category.bookmarks || category.bookmarks.length === 0) {
        bookmarkListElement.innerHTML = '<p>No bookmarks added to this category yet.</p>';
    }

    category.bookmarks.forEach(bookmark => {
        const li = document.createElement('li');
        li.dataset.bookmarkId = bookmark.id;

        // Div for bookmark details (Title and URL)
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'bookmark-details';
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = bookmark.title;
        titleSpan.style.fontWeight = 'bold'; // Make title stand out

        const urlSpan = document.createElement('span');
        urlSpan.textContent = bookmark.url;
        urlSpan.className = 'bookmark-url';

        detailsDiv.appendChild(titleSpan);
        detailsDiv.appendChild(document.createElement('br')); // New line for URL
        detailsDiv.appendChild(urlSpan);

        // Div for controls
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'bookmark-item-controls';

        // Edit Button (Placeholder)
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.title = 'Edit Bookmark Title/URL'; // Clarify title
        editButton.className = 'edit-bookmark-button';
        editButton.onclick = () => handleEditBookmark(category.id, bookmark.id);

        // --- Add Edit Icon Button ---
        const editIconButton = document.createElement('button');
        editIconButton.textContent = 'Icon';
        editIconButton.title = 'Set Custom Icon URL';
        editIconButton.className = 'edit-icon-button'; // Add a class for styling if needed
        editIconButton.onclick = () => handleEditBookmarkIcon(category.id, bookmark.id);
        // --- End Add Edit Icon Button ---

        // Delete Button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.title = 'Delete Bookmark';
        deleteButton.className = 'delete-bookmark-button';
        deleteButton.onclick = () => handleDeleteBookmark(category.id, bookmark.id);

        controlsDiv.appendChild(editButton);
        controlsDiv.appendChild(editIconButton); // Add the new button
        controlsDiv.appendChild(deleteButton);

        li.appendChild(detailsDiv);
        li.appendChild(controlsDiv);
        bookmarkListElement.appendChild(li);
    });
}

function handleAddBookmark() {
    if (!selectedCategoryForManagement) return; // Should not happen if UI is correct

    const title = newBookmarkTitleInput.value.trim();
    let url = newBookmarkUrlInput.value.trim();

    if (!title || !url) {
        alert('Please enter both a title and a URL.');
        return;
    }

    // Basic URL validation/prefixing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url; // Default to https
    }
    try {
        new URL(url); // Check if URL is valid
    } catch (_) {
        alert('Please enter a valid URL (e.g., https://example.com).');
        return;
    }

    const category = tabvanaData.categories.find(c => c.id === selectedCategoryForManagement);
    if (!category) return;

    const newBookmark = {
        id: generateId(),
        title: title,
        url: url,
        customIconUrl: null // Initialize custom icon URL as null
    };

    // Ensure bookmarks array exists
    if (!category.bookmarks) {
        category.bookmarks = [];
    }
    
    category.bookmarks.push(newBookmark);

    // Clear inputs
    newBookmarkTitleInput.value = '';
    newBookmarkUrlInput.value = '';

    // Re-render list and save
    renderBookmarkManagementList(selectedCategoryForManagement);
    saveData();
}

function handleDeleteBookmark(categoryId, bookmarkId) {
    const category = tabvanaData.categories.find(c => c.id === categoryId);
    if (!category || !category.bookmarks) return;

    const bookmarkIndex = category.bookmarks.findIndex(b => b.id === bookmarkId);
    if (bookmarkIndex === -1) return; // Bookmark not found
    
    const bookmarkTitle = category.bookmarks[bookmarkIndex].title;
    
    // Confirmation
    if (!confirm(`Are you sure you want to delete the bookmark "${bookmarkTitle}"?`)) {
        return;
    }

    // Remove the bookmark
    category.bookmarks.splice(bookmarkIndex, 1);

    // Re-render list and save
    renderBookmarkManagementList(categoryId);
    saveData();
}

// --- New Function: Handle Editing Bookmark Icon ---
function handleEditBookmarkIcon(categoryId, bookmarkId) {
    const category = tabvanaData.categories.find(c => c.id === categoryId);
    if (!category || !category.bookmarks) return;

    const bookmark = category.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    const currentIconUrl = bookmark.customIconUrl || '';
    const newIconUrl = prompt(`Enter new icon URL for "${bookmark.title}":\n(Leave blank to clear custom icon)`, currentIconUrl);

    if (newIconUrl === null) {
        console.log('[Tabvana Edit Icon] User cancelled prompt.');
        return; // User cancelled
    }

    const trimmedUrl = newIconUrl.trim();

    if (trimmedUrl === currentIconUrl) {
        console.log('[Tabvana Edit Icon] URL unchanged.');
        return; // No change
    }

    // Basic check if it looks like a URL (optional, but helpful)
    if (trimmedUrl && !trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        alert('Invalid URL. Please enter a full URL starting with http:// or https://, or leave blank to clear.');
            return;
    }

    // Update the bookmark
    bookmark.customIconUrl = trimmedUrl || null; // Set to null if blank
    console.log(`[Tabvana Edit Icon] Set customIconUrl for ${bookmarkId} to:`, bookmark.customIconUrl);

    saveData();
    renderCurrentView(); // Re-render to show the new icon (or fallback)
}
// --- End New Function ---

// TODO: handleEditBookmark
function handleEditBookmark(categoryId, bookmarkId) {
    const category = tabvanaData.categories.find(c => c.id === categoryId);
    if (!category || !category.bookmarks) return;

    const bookmark = category.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    // Prompt for new title
    const newTitle = prompt(`Enter new title for "${bookmark.title}":`, bookmark.title);
    if (newTitle === null) return; // User cancelled title prompt
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
        alert("Bookmark title cannot be empty.");
        return;
    }

    // Prompt for new URL
    const newUrlInput = prompt(`Enter new URL for "${trimmedTitle}":`, bookmark.url);
    if (newUrlInput === null) return; // User cancelled URL prompt
    let newUrl = newUrlInput.trim();
    if (!newUrl) {
        alert("Bookmark URL cannot be empty.");
        return;
    }
    // Basic URL validation/prefixing
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
        newUrl = 'https://' + newUrl;
    }
    try {
        new URL(newUrl); // Check if URL is valid
    } catch (_) {
        alert('Please enter a valid URL (e.g., https://example.com).');
        return;
    }

    // Update bookmark data if changed
    let changed = false;
    if (trimmedTitle !== bookmark.title) {
        bookmark.title = trimmedTitle;
        changed = true;
    }
    if (newUrl !== bookmark.url) {
        bookmark.url = newUrl;
        changed = true;
    }

    if (changed) {
        // Re-render list and save
        renderBookmarkManagementList(categoryId);
        // Re-render main grid if necessary
        if (selectedCategoryId === categoryId) {
            handleCategoryClick(categoryId); 
        }
        saveData();
        console.log("Bookmark updated:", bookmark);
    }
}

// === Global Save Button Logic ===
async function handleSaveSettings() {
  // Update general settings in tabvanaData object
  tabvanaData.unsplashApiKey = unsplashApiKeyInput.value.trim() || null;
  tabvanaData.unsplashTheme = unsplashThemeSelect.value;
  tabvanaData.unsplashQuality = unsplashQualitySelect.value;
  tabvanaData.userName = userNameInput.value.trim() || '';
  const oldTempUnit = tabvanaData.temperatureUnit;
  tabvanaData.temperatureUnit = temperatureUnitSelect.value;
  tabvanaData.searchEngine = searchEngineSelect.value;
  tabvanaData.themeMode = themeModeSelect.value; // Save themeMode
  tabvanaData.customBackgroundUrl = customBackgroundUrlInput.value.trim() || null; // Save custom background URL

  const originalButtonText = saveSettingsButton.textContent;
  saveSettingsButton.disabled = true; // Prevent double-click
  saveSettingsButton.textContent = 'Saving...';

  await saveData(); // Save the entire updated tabvanaData object

  console.log('Settings saved:', tabvanaData);
  saveSettingsButton.textContent = 'Saved!';

  // Update UI based on new settings
  displayGreeting(tabvanaData.userName);
  // Apply background based on potentially new settings (custom, Unsplash, or default)
  await applyBackground();
  // If temp unit changed, refresh weather data for header
  if (oldTempUnit !== tabvanaData.temperatureUnit) {
    refreshWeatherHeader(true);
  } else {
    // If unit didn't change, still update display in case other weather data (like snapshot) is present
    updateCurrentWeatherDisplay(tabvanaData.temperatureUnit, tabvanaData.currentWeatherSnapshot);
  }
  applyThemeMode(tabvanaData.themeMode); // Apply theme on save

  // Reset button after a delay
  setTimeout(() => {
    saveSettingsButton.textContent = originalButtonText;
    saveSettingsButton.disabled = false;
  }, 1500);
}

// --- New Function: Apply Theme Mode ---
function applyThemeMode(mode) {
  if (mode === 'light') {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme'); // Ensure only one theme class is active
  } else { // Default to dark
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  }
  console.log(`[Tabvana] Theme applied: ${mode}`);
}

// --- End New Function ---

// === Main View Logic (Displaying Content) ===

function handleCategoryClick(categoryId) {
    console.log(`[Tabvana] handleCategoryClick: Category selected: ${categoryId}`);
    const category = tabvanaData.categories.find(c => c.id === categoryId);

    if (category) {
        selectedCategoryId = categoryId;
        currentCategory = category; // Set the global currentCategory object
        currentView = 'category';
        showingInitialView = false;
        console.log(`[Tabvana] handleCategoryClick: Set currentView to 'category', currentCategory to: ${category.name}`);
    } else {
        console.warn(`[Tabvana] handleCategoryClick: Category with ID ${categoryId} not found. Staying on current view: ${currentView}`);
        // Optionally revert to initial view or show error
        // currentView = 'initial'; // Or some error state
        // selectedCategoryId = null;
        // currentCategory = null;
    }
    renderCategoriesBar(); // Update category bar for active state
    renderCurrentView();
}

// --- Function to Open/Close Modal ---
function openModal() {
    if (importModalOverlay) {
        importModalOverlay.style.display = 'flex'; // Use flex to enable centering
    }
}

function closeModal() {
    if (importModalOverlay) {
        importModalOverlay.style.display = 'none';
    }
}

// --- Function to Select/Deselect All Checkboxes ---
function selectAllImportCheckboxes(checked) {
    const checkboxes = importFolderList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = checked);
}

// --- Updated Function to INITIATE Import (Opens Modal) ---
async function handleImportBookmarks() {
    console.log('Opening import selection modal...');
    try {
        const tree = await chrome.bookmarks.getTree();
        console.log('Bookmark tree fetched:', tree);

        const foldersToDisplay = [];
        if (tree.length > 0 && tree[0].children) {
            const rootChildren = tree[0].children;

            // Iterate through the main children of the root (e.g., "Bookmarks Bar", "Other Bookmarks")
            for (const mainFolder of rootChildren) {
                if (mainFolder.children && mainFolder.children.length > 0) {
                    // If this main folder itself is one we typically want to list its children from
                    // (e.g., "Bookmarks Bar", "Other Bookmarks", "Mobile Bookmarks")
                    // For simplicity, let's list all folders directly under these main roots.
                    // More sophisticated filtering could be added here if needed (e.g. by title or known IDs of these roots)

                    // Add the main folder itself if it's not just a root container like "Bookmarks Menu"
                    // Check if it's a user-meaningful folder.
                    // Standard IDs: Bookmarks Bar: "1", Other: "2", Mobile: often "3"
                    // Non-standard IDs for menu, etc. are like 'menu________'
                    if (mainFolder.id && !mainFolder.id.endsWith("________")) {
                         foldersToDisplay.push({ id: mainFolder.id, title: mainFolder.title || 'Untitled Folder' });
                    }


                    // And add its children if they are folders
                    mainFolder.children.forEach(subFolder => {
                        // Check if it's a folder (some items might be bookmarks, not folders)
                        // A more reliable check for a folder is the presence of a `children` array,
                        // or if `type` property exists and is 'folder'.
                        // Not all bookmark nodes have a `type` property.
                        if (subFolder.children !== undefined) { // It's a folder if it can have children
                             foldersToDisplay.push({ id: subFolder.id, title: subFolder.title || 'Untitled Folder' });
                        }
                    });
                } else if (mainFolder.children === undefined && mainFolder.url === undefined) {
                    // This is a folder without children directly under the root (e.g. user created folder at top level)
                     if (mainFolder.id && !mainFolder.id.endsWith("________")) { // Avoid system folders
                        foldersToDisplay.push({ id: mainFolder.id, title: mainFolder.title || 'Untitled Folder' });
                     }
                }
            }
        }
        
        // Filter out duplicates (e.g. if a main folder and its subfolder got added with similar logic)
        // A simple Map based on ID should suffice for uniqueness
        const uniqueFolders = Array.from(new Map(foldersToDisplay.map(f => [f.id, f])).values());

        populateImportModal(uniqueFolders);
        openModal();

    } catch (error) {
        console.error('Error fetching bookmark tree for import:', error);
        alert('Failed to fetch bookmarks for import. See console for details.');
    }
}

// --- Function to Populate Modal Checkboxes ---
function populateImportModal(folders) {
    importFolderList.innerHTML = ''; // Clear previous list
    if (!folders || folders.length === 0) {
        importFolderList.innerHTML = '<p>No top-level bookmark folders found.</p>';
        return;
    }

    folders.forEach(folder => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = folder.id;
        checkbox.id = `import-folder-${folder.id}`;
        checkbox.checked = true; // Default to selected

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${folder.title}`));
        label.htmlFor = checkbox.id;

        importFolderList.appendChild(label);
    });
}

// --- Function to Handle Import Confirmation ---
function handleConfirmImportSelection() {
    const selectedCheckboxes = importFolderList.querySelectorAll('input[type="checkbox"]:checked');
    const selectedFolderIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (selectedFolderIds.length === 0) {
        alert('Please select at least one folder to import.');
        return;
    }

    closeModal();
    performSelectiveImport(selectedFolderIds); // Pass selected IDs to the import function
}

// --- New Function to Perform the Actual Selective Import ---
async function performSelectiveImport(folderIds) {
    console.log('Starting selective import/refresh for folders:', folderIds);
    let importedBookmarkCountTotal = 0;
    let categoriesAdded = 0;
    let categoriesUpdated = 0; // Changed from categoriesMerged
    let bookmarksAddedToExisting = 0;
    let skippedDuplicateUrls = 0;

    // Helper remains the same
    async function extractBookmarksRecursive(folderNode, currentCategoryName, currentBookmarksArray) {
        if (!folderNode.children) return;

        for (const child of folderNode.children) {
            if (child.url && !child.url.startsWith('javascript:')) { 
                currentBookmarksArray.push({
                            // Use browser bookmark ID temporarily if needed for mapping, or generate ours
                            // id: child.id, // Potentially use browser ID for future sync?
                            id: generateId(), // Stick with generating our own ID for now
                            title: child.title || 'Untitled Bookmark',
                            url: child.url,
                            customIconUrl: null,
                            // browserId: child.id // Optionally store browser ID
                        });
                // Note: importedBookmarkCountTotal is incremented later based on actual additions
            } else if (child.children) { 
                console.log(`Processing sub-folder "${child.title}" within "${currentCategoryName}"`);
                await extractBookmarksRecursive(child, currentCategoryName, currentBookmarksArray); // Pass the array along
            }
        }
    }

    try {
        for (const folderId of folderIds) {
            const subTreeNodes = await chrome.bookmarks.getSubTree(folderId);
            if (!subTreeNodes || subTreeNodes.length === 0) continue; 
            
            const folderNode = subTreeNodes[0]; 
            const categoryName = folderNode.title || 'Untitled Folder';
            let browserBookmarksInFolder = []; // Array to hold bookmarks extracted from this browser folder

            console.log(`Extracting bookmarks from selected browser folder: "${categoryName}" (ID: ${folderId})`);
            await extractBookmarksRecursive(folderNode, categoryName, browserBookmarksInFolder); 

            if (browserBookmarksInFolder.length > 0) {
                // Find existing category by EXACT name match
                let existingCategory = tabvanaData.categories.find(c => c.name === categoryName);

                if (existingCategory) {
                    console.log(`Refreshing existing category "${categoryName}".`);
                    const existingUrls = new Set(existingCategory.bookmarks.map(b => b.url));
                    let bookmarksAddedThisTime = 0;
                    
                    browserBookmarksInFolder.forEach(browserBookmark => {
                        if (!existingUrls.has(browserBookmark.url)) {
                            existingCategory.bookmarks.push(browserBookmark); // Add only if URL is new
                            bookmarksAddedThisTime++;
                            importedBookmarkCountTotal++; // Increment total count
                            existingUrls.add(browserBookmark.url); // Add to set to prevent duplicates within the same import batch
                        } else {
                            skippedDuplicateUrls++;
                        }
                    });

                    if (bookmarksAddedThisTime > 0) {
                        categoriesUpdated++;
                        bookmarksAddedToExisting += bookmarksAddedThisTime;
                        console.log(`Added ${bookmarksAddedThisTime} new bookmarks to "${categoryName}".`);
                    }
                } else {
                    // Category does not exist, create it
                    console.log(`Adding new category "${categoryName}" with ${browserBookmarksInFolder.length} bookmarks.`);
                    tabvanaData.categories.push({
                        id: generateId(),
                        name: categoryName,
                        bookmarks: browserBookmarksInFolder
                    });
                    categoriesAdded++;
                    importedBookmarkCountTotal += browserBookmarksInFolder.length; // All are new
                }
            } else {
                console.log(`Selected folder "${categoryName}" (and its subfolders) contained no direct bookmarks to import.`);
            }
        }

        if (categoriesAdded > 0 || categoriesUpdated > 0) {
            renderCategoryManagementList();
            renderCategoriesBar();
            await saveData();
            // Improved confirmation message
            let message = `Refresh complete!
New categories created: ${categoriesAdded}
Existing categories updated: ${categoriesUpdated}
New bookmarks added: ${importedBookmarkCountTotal}`; // Use total added count
            if (skippedDuplicateUrls > 0) {
                 message += `\n(Skipped ${skippedDuplicateUrls} bookmarks with duplicate URLs)`;
            }
            alert(message);
        } else {
            alert('Refresh finished. No new bookmarks or categories were added (folders might have been empty or contained only duplicates).');
        }
        console.log('Selective bookmark refresh finished.');

    } catch (error) {
        console.error('Error during selective bookmark import:', error);
        alert('An error occurred during import. See console for details.');
    }
}
// --- End Selective Import Function ---

// --- New Function: Populate Unsplash Theme Dropdown ---
function populateUnsplashThemeDropdown() {
    if (!unsplashThemeSelect) return;

    UNSPLASH_TOPICS.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic.value;
        option.textContent = topic.name;
        unsplashThemeSelect.appendChild(option);
    });
}

// --- New Function: Populate Search Engine Dropdown ---
function populateSearchEngineDropdown() {
    if (!searchEngineSelect) return;

    Object.entries(SEARCH_ENGINES).forEach(([key, engine]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = engine.name;
        searchEngineSelect.appendChild(option);
    });
}

// Helper function for ordinal suffixes (1st, 2nd, 3rd, 4th...)
function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th'; // Handle 11th, 12th, 13th
  switch (day % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}

// Helper function to format the date
function formatDate(date) {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const weekday = weekdays[date.getDay()];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);

  return `${weekday}, ${month} ${day}${suffix}`;
}

// Function to update the date display
function updateDate() {
  if (!dateDisplayElement) return;
  const now = new Date();
  dateDisplayElement.textContent = formatDate(now);
}

// === NEW: Initial View Rendering (Top Sites + Favorites) ===
async function renderInitialView() {
  console.log("[Tabvana] renderInitialView Starting...");
  currentView = 'initial';
  selectedCategoryId = null;
  currentCategory = null; // Ensure currentCategory is reset
  showingInitialView = true;

  // Fetch top sites first
  try {
    if (tabvanaData.showTopSites) {
      topSitesCache = await chrome.topSites.get();
      console.log("[Tabvana] renderInitialView: Fetched top sites into cache:", topSitesCache.length);
    }
  } catch (error) {
    console.error('[Tabvana] renderInitialView: Error fetching top sites:', error);
    topSitesCache = [];
  }
  
  renderCategoriesBar(); // Update category bar for active state
  renderCurrentView(); // This will now use the 'initial' case
  console.log("[Tabvana] renderInitialView Finished.");
}

// --- Function to Open/Close Icon Search Modal ---
function openIconSearchModal(categoryId, bookmarkId, bookmarkTitle) {
    currentIconSearchCategoryId = categoryId;
    currentIconSearchBookmarkId = bookmarkId;

    if (iconSearchModalTitle) {
        iconSearchModalTitle.textContent = `Find Icon for "${bookmarkTitle}"`;
    }
    if (iconSearchInput) {
        iconSearchInput.value = bookmarkTitle; // Pre-fill search with bookmark title
    }
    if (iconResultsGrid) {
        iconResultsGrid.innerHTML = ''; // Clear previous results
    }
    if (iconSearchStatus) {
        iconSearchStatus.textContent = ''; // Clear status
    }

    if (iconSearchModalOverlay) {
        iconSearchModalOverlay.style.display = 'flex';
    }
}

function closeIconSearchModal() {
    if (iconSearchModalOverlay) {
        iconSearchModalOverlay.style.display = 'none';
    }
    currentIconSearchCategoryId = null; // Clear context
    currentIconSearchBookmarkId = null;
}

// --- Edit Mode Toggle Function ---
function toggleEditMode() {
  isEditMode = !isEditMode;
  console.log(`[Tabvana] Edit mode toggled: ${isEditMode}`);
  
  if (document.body) {
    document.body.classList.toggle('edit-mode-active', isEditMode);
    console.log(`[Tabvana] Body class 'edit-mode-active' set to: ${document.body.classList.contains('edit-mode-active')}`);
  } else {
    console.error('[Tabvana] toggleEditMode: document.body not found!');
  }

  // Update the button's title hint
  if (editModeToggleButton) { 
    editModeToggleButton.title = isEditMode ? "Exit Edit Mode & Save Changes" : "Toggle Edit Mode";
    // Visual state of editModeToggleButton itself is handled by CSS: body.edit-mode-active .edit-mode-button
    if (!isEditMode) {
      // Save any pending changes when exiting edit mode
      saveData();
    }
  } else {
    console.error('[Tabvana] ToggleEditMode: editModeToggleButton element not found!');
  }

  // Re-render grids to apply/remove draggable attributes etc.
  // Delay this call slightly to ensure the current event cycle completes first
  setTimeout(() => {
    console.log('[Tabvana] Executing delayed renderCurrentView after toggle.');
    renderCurrentView(); 
  }, 0); 
}

// Helper to create a grid (either main bookmark grid or top sites grid)
function createGrid(container, isFavoritesGrid = false, isTopSites = false) {
  console.log(`[Tabvana] createGrid called. For container: ${container?.id}, isFavorites: ${isFavoritesGrid}, isTopSites: ${isTopSites}`);
  let grid = document.createElement('div');
  grid.className = 'bookmark-grid'; // Base class

  if (isTopSites) {
    grid.classList.add('top-sites-grid');
  } else if (isFavoritesGrid) {
    grid.classList.add('favorites-grid');
  }
  // If no specific type, it's a regular category bookmark grid, already has 'bookmark-grid'

  // If a container is passed, this function is expected to append the new grid to it.
  // The calling functions (renderBookmarkGrid/renderTopSitesGrid) will handle clearing the container first.
  if (container) {
    // The calling function now clears the container, so we just append here.
    // container.innerHTML = ''; // No longer clear here
    container.appendChild(grid);
    console.log('[Tabvana] createGrid: Appended new grid to container.');
    return grid; // Return the grid that was appended to the container
  } else {
    // If no container, the caller wants a new grid element to manage itself.
    console.log('[Tabvana] createGrid: Created new grid element (no container provided).');
    return grid; // Return the newly created grid element
  }
}

function renderBookmarkGrid(container, bookmarks, isFavoritesView = false, currentCategoryId = null, isEditModeActive = false) {
  console.log('[Tabvana] renderBookmarkGrid called.');
  console.log('[Tabvana] renderBookmarkGrid - Container ID:', container?.id);
  console.log('[Tabvana] renderBookmarkGrid - Bookmarks defined:', !!bookmarks);
  if (bookmarks) console.log('[Tabvana] renderBookmarkGrid - Bookmarks count:', bookmarks.length);
  console.log('[Tabvana] renderBookmarkGrid - CategoryID:', currentCategoryId);
  console.log(`[Tabvana] renderBookmarkGrid called. Container: ${container?.id}, Bookmarks defined: ${!!bookmarks}, CategoryID: ${currentCategoryId}, EditMode: ${isEditModeActive}`);
  if (bookmarks) console.log(`[Tabvana] renderBookmarkGrid bookmarks count: ${bookmarks.length}`);
  const gridElement = container.querySelector('.bookmark-grid:not(.top-sites-grid):not(.favorites-grid)') || 
                      (isFavoritesView ? container.querySelector('.favorites-grid') : null) || 
                      createGrid(container, isFavoritesView, false); // last param isTopSites = false
  gridElement.innerHTML = ''; // Clear previous items

  if (!bookmarks || bookmarks.length === 0) {
    renderEmptyState(gridElement, isFavoritesView ? "No favorites yet!" : "No bookmarks in this category yet. Add some!");
    return;
  }

  bookmarks.forEach((bookmark, index) => {
    const item = document.createElement('a');
    item.href = bookmark.url;
    item.target = "_blank";
    item.rel = "noopener noreferrer";
    item.className = 'bookmark-item';
    item.dataset.bookmarkId = bookmark.id;

    if (isFavoritesView && bookmark.categoryId) {
      // For favorites view, the categoryId comes from the bookmark object itself
      item.dataset.categoryId = bookmark.categoryId;
    } else if (currentCategoryId) {
      // For regular category view, it comes from the function parameter
      item.dataset.categoryId = currentCategoryId;
    }

    const favButton = document.createElement('button');
    favButton.title = bookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites';
    favButton.className = 'favorite-toggle-button';
    if (bookmark.isFavorite) {
      favButton.classList.add('is-favorite');
      favButton.textContent = '★'; // Filled star
    } else {
      favButton.classList.remove('is-favorite');
      favButton.textContent = '☆'; // Empty star
    }
    // Click handling is now fully delegated to handleBookmarkGridClick

    item.appendChild(favButton);

    // --- Restore detailed Icon Loading Logic --- 
    const img = document.createElement('img');
    const googleFaviconBase = 'https://www.google.com/s2/favicons?sz=64&domain_url=';
    const localFallbackSrc = chrome.runtime.getURL('assets/icons/default-favicon.png');
    const domainUrl = bookmark.url;

    img.alt = (bookmark.title || "Bookmark") + " icon";
    let primaryIconSrc = bookmark.customIconUrl;

    const setLocalFallback = () => {
      if (img.src !== localFallbackSrc) {
        console.log(`[Tabvana ICON] Setting local fallback for ${domainUrl}`);
        img.src = localFallbackSrc;
        img.onerror = null; // Prevent loops if fallback also fails
        img.onload = null;
      }
    };

    const tryGoogleFaviconService = () => {
      const googleSrc = googleFaviconBase + encodeURIComponent(domainUrl);
      console.log(`[Tabvana ICON] Trying Google Favicon service for ${domainUrl}: ${googleSrc}`);
      img.src = googleSrc;
      img.onload = () => {
        if (!img.complete || typeof img.naturalWidth === "undefined" || img.naturalWidth === 0 || img.naturalWidth < 32) { 
          console.log(`[Tabvana ICON] Google Favicon for ${domainUrl} invalid/tiny. Setting fallback.`);
          setLocalFallback();
        } else {
          console.log(`[Tabvana ICON] Google Favicon for ${domainUrl} loaded successfully.`);
          img.onload = null; 
        }
      };
      img.onerror = () => {
        console.log(`[Tabvana ICON] Error loading Google Favicon for ${domainUrl}. Setting fallback.`);
        setLocalFallback();
      };
    };

    if (primaryIconSrc) {
      console.log(`[Tabvana ICON] Trying primary (custom) icon for ${domainUrl}: ${primaryIconSrc}`);
      img.src = primaryIconSrc;
      img.onload = () => {
         if (!img.complete || typeof img.naturalWidth === "undefined" || img.naturalWidth === 0 || img.naturalWidth <= 2) { // Check if primary loaded ok
            console.log(`[Tabvana ICON] Primary icon ${primaryIconSrc} invalid/tiny. Trying Google Service.`);
            tryGoogleFaviconService();
          } else {
            console.log(`[Tabvana ICON] Primary icon ${primaryIconSrc} loaded successfully.`);
            img.onload = null; // Clear handler if loaded successfully
          }
      };
      img.onerror = () => {
        console.log(`[Tabvana ICON] Error loading primary icon ${primaryIconSrc}. Trying Google Service.`);
        tryGoogleFaviconService();
      };
    } else {
      // No custom URL, try Google service directly
      tryGoogleFaviconService();
    }
    // --- End Icon Loading Logic ---

    // Add specific class and title hint for icon editing when in edit mode
    if (isEditModeActive) {
      img.classList.add('editable-icon'); 
      img.title = 'Click to change icon'; 
    }
    item.appendChild(img);

    const span = document.createElement('span');
    span.textContent = bookmark.title || bookmark.url;
    // Make title editable in edit mode
    if (isEditModeActive) {
      span.contentEditable = "true";
      span.classList.add('editable-title'); 
      span.title = 'Click to edit title'; 
      // Prevent dragging directly on the title when editing
      span.draggable = false; 
      // Stop drag initiation from title span specifically
      span.addEventListener('dragstart', (e) => {
          e.preventDefault();
          e.stopPropagation(); 
      }); 
    }
    item.appendChild(span);

    // Make the whole item draggable in edit mode (for reordering)
    if (isEditModeActive && !isFavoritesView) { 
      item.draggable = true;
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
    }
    gridElement.appendChild(item);
  }); // End bookmarks.forEach

  // Add delegated listeners to the grid for editing title/icon
  if (isEditModeActive) {
      gridElement.addEventListener('click', handleGridEditClick); // Handles icon clicks
      gridElement.addEventListener('blur', handleGridEditBlur, true); // Use capture phase for blur on title spans
      // Add keydown listener for Enter key on titles
      gridElement.addEventListener('keydown', handleGridEditKeydown, true); 
  } else {
      // Remove delegated listeners when not in edit mode
      gridElement.removeEventListener('click', handleGridEditClick);
      gridElement.removeEventListener('blur', handleGridEditBlur, true);
      gridElement.removeEventListener('keydown', handleGridEditKeydown, true);
  }

  // Event listeners for dragover/drop remain on the gridElement
  if (isEditModeActive && !isFavoritesView) {
    // Ensure these are attached (should be okay from previous code)
    if (!gridElement.hasAttribute('data-dnd-listeners-attached')) {
         gridElement.addEventListener('dragover', handleDragOver);
         gridElement.addEventListener('dragleave', handleDragLeave);
         gridElement.addEventListener('drop', handleDrop);
         gridElement.setAttribute('data-dnd-listeners-attached', 'true');
     }
  } else {
    // Remove DND listeners if not in edit mode
    gridElement.removeEventListener('dragover', handleDragOver);
    gridElement.removeEventListener('dragleave', handleDragLeave);
    gridElement.removeEventListener('drop', handleDrop);
    gridElement.removeAttribute('data-dnd-listeners-attached');
  }
}

function renderTopSitesGrid(container, topSites, isEditModeActive = false) {
  console.log('[Tabvana] renderTopSitesGrid called.');
  if (topSites) console.log(`[Tabvana] renderTopSitesGrid topSites count: ${topSites.length}`);
  const gridElement = container.querySelector('.top-sites-grid') || createGrid(container, false, true);
  gridElement.innerHTML = ''; 
  topSites.forEach(site => {
    const item = document.createElement('a');
    item.href = site.url;
    item.target = "_blank";
    item.rel = "noopener noreferrer";
    item.className = 'bookmark-item top-site-item'; 
    item.dataset.topSiteUrl = site.url;

    // --- Restore detailed Icon Loading Logic for Top Sites --- 
    const img = document.createElement('img');
    const googleFaviconBase = 'https://www.google.com/s2/favicons?sz=64&domain_url=';
    const localFallbackSrc = chrome.runtime.getURL('assets/icons/default-favicon.png');
    const domainUrl = site.url; 

    img.alt = (site.title || "Site") + " icon";
    let primaryIconSrc = site.favicon; // Top sites might provide a favicon URL directly

    const setLocalFallback = () => {
      if (img.src !== localFallbackSrc) {
        console.log(`[Tabvana ICON] Setting local fallback for TOP SITE ${domainUrl}`);
        img.src = localFallbackSrc;
        img.onerror = null; 
        img.onload = null;
      }
    };

    const tryGoogleFaviconService = () => {
      const googleSrc = googleFaviconBase + encodeURIComponent(domainUrl);
      console.log(`[Tabvana ICON] Trying Google Favicon service for TOP SITE ${domainUrl}: ${googleSrc}`);
      img.src = googleSrc;
      img.onload = () => {
        if (!img.complete || typeof img.naturalWidth === "undefined" || img.naturalWidth === 0 || img.naturalWidth < 32) { 
          console.log(`[Tabvana ICON] Google Favicon for TOP SITE ${domainUrl} invalid/tiny. Setting fallback.`);
          setLocalFallback();
        } else {
          console.log(`[Tabvana ICON] Google Favicon for TOP SITE ${domainUrl} loaded successfully.`);
          img.onload = null;
          }
      };
      img.onerror = () => {
        console.log(`[Tabvana ICON] Error loading Google Favicon for TOP SITE ${domainUrl}. Setting fallback.`);
        setLocalFallback();
      };
    };

    if (primaryIconSrc) {
      console.log(`[Tabvana ICON] Trying primary (API) icon for TOP SITE ${domainUrl}: ${primaryIconSrc}`);
      img.src = primaryIconSrc;
      img.onload = () => {
         if (!img.complete || typeof img.naturalWidth === "undefined" || img.naturalWidth === 0 || img.naturalWidth <= 2) {
            console.log(`[Tabvana ICON] Primary TOP SITE icon ${primaryIconSrc} invalid/tiny. Trying Google Service.`);
            tryGoogleFaviconService();
          } else {
            console.log(`[Tabvana ICON] Primary TOP SITE icon ${primaryIconSrc} loaded successfully.`);
            img.onload = null;
          }
      };
      img.onerror = () => {
        console.log(`[Tabvana ICON] Error loading primary TOP SITE icon ${primaryIconSrc}. Trying Google Service.`);
        tryGoogleFaviconService();
      };
    } else {
      // No API-provided favicon, try Google service directly
      tryGoogleFaviconService();
    }
    // --- End Icon Loading Logic ---

    item.appendChild(img);

    const span = document.createElement('span');
    span.textContent = site.title || site.url;
    item.appendChild(span);
    gridElement.appendChild(item);
  });
}

function renderCurrentView() {
  console.log(`[Tabvana] renderCurrentView called. CurrentView: ${currentView}`);
  const container = document.getElementById('bookmark-grid-container');
  if (!container) {
    console.error('[Tabvana] renderCurrentView: bookmark-grid-container not found!');
    return;
  }
  container.innerHTML = ''; 

  switch (currentView) {
    case 'category': {
      if (currentCategory && currentCategory.bookmarks) {
        renderBookmarkGrid(container, currentCategory.bookmarks, false, currentCategory.id, isEditMode);
      } else {
        renderEmptyState(container, "Category empty or not found.");
      }
      break;
    }
    case 'favorites': {
      const favorites = getAllFavoriteBookmarks();
      renderBookmarkGrid(container, favorites, true, null, isEditMode);
      break;
    }
    case 'search': {
      if (currentSearchResults && currentSearchResults.length > 0) {
        renderBookmarkGrid(container, currentSearchResults, false, null, isEditMode); 
      } else {
        renderEmptyState(container, "No search results.");
      }
      break;
    }
    case 'initial':
    default: {
      console.log(`[Tabvana] renderCurrentView - Case 'initial' (default). showTopSites: ${tabvanaData.showTopSites}, topSitesCache count: ${topSitesCache ? topSitesCache.length : '0 or undefined'}`);
      let contentRendered = false;
      if (tabvanaData.showTopSites && topSitesCache && topSitesCache.length > 0) {
      const topSitesHeader = document.createElement('h3');
      topSitesHeader.textContent = 'Most Visited';
      topSitesHeader.className = 'grid-section-header';
        container.appendChild(topSitesHeader);
        renderTopSitesGrid(container, topSitesCache, isEditMode);
        contentRendered = true;
      }

      const favorites = getAllFavoriteBookmarks(); 
      if (favorites && favorites.length > 0) {
        const favoritesHeader = document.createElement('h3');
        favoritesHeader.textContent = 'Favorites';
        favoritesHeader.className = 'grid-section-header';
        container.appendChild(favoritesHeader);
        const favoritesGridContainer = document.createElement('div');
        favoritesGridContainer.id = 'favorites-grid-specific-container';
        container.appendChild(favoritesGridContainer);
        renderBookmarkGrid(favoritesGridContainer, favorites, true, null, isEditMode);
        contentRendered = true;
      }

      if (!contentRendered) {
        if (!tabvanaData.showTopSites && (!favorites || favorites.length === 0)) {
          renderEmptyState(container, "Top Sites are disabled and no favorites yet. Add some or enable Top Sites in Settings.");
        } else if (!tabvanaData.showTopSites) {
          renderEmptyState(container, "Top Sites are disabled. You can enable them in Settings or add Favorites.");
        } else if (!favorites || favorites.length === 0) {
          renderEmptyState(container, "No Top Sites or Favorites to display. They will appear as you browse or add them.");
      } else {
           renderEmptyState(container, "Welcome! Select a category or add bookmarks via Settings.");
        }
      }
      break;
    }
  }
}

// --- Drag and Drop Handlers ---
function handleDragStart(event) {
  if (!isEditMode) return;
  const target = event.target.closest('.bookmark-item');
  if (!target) return;

  draggedItemData = {
    bookmarkId: target.dataset.bookmarkId,
    categoryId: target.dataset.categoryId,
    // originalIndex: Array.from(target.parentNode.children).indexOf(target) // Might not be reliable if grid changes
  };
  event.dataTransfer.setData('text/plain', draggedItemData.bookmarkId); // Necessary for Firefox
  event.dataTransfer.effectAllowed = 'move';
  target.classList.add('dragging');
  console.log('[Tabvana DND] Drag Start:', draggedItemData);
}

function handleDragEnd(event) {
  if (!isEditMode) return;
  const target = event.target.closest('.bookmark-item');
  if (target) {
    target.classList.remove('dragging');
  }
  document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
  draggedItemData = null;
  console.log('[Tabvana DND] Drag End');
}

function handleDragOver(event) {
  event.preventDefault(); // Necessary to allow dropping
  if (!isEditMode || !draggedItemData) return;
  event.dataTransfer.dropEffect = 'move';

  const targetItem = event.target.closest('.bookmark-item');
  document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));

  if (targetItem && targetItem.dataset.bookmarkId !== draggedItemData.bookmarkId) {
    targetItem.classList.add('drag-over-target');
  } else if (!targetItem && event.currentTarget.classList.contains('bookmark-grid')) {
    // If dragging over the grid container but not a specific item (e.g., to the end)
    // We could add a class to the grid container itself or a placeholder element
    // For now, we'll rely on dropping ON an item to determine position.
  }
}

function handleDragLeave(event) {
  if (!isEditMode) return;
  const relatedTarget = event.relatedTarget;
  const currentTarget = event.currentTarget;

  // Only remove drag-over-target if leaving the grid or entering a non-bookmark-item child
  if (!currentTarget.contains(relatedTarget) || (relatedTarget && !relatedTarget.closest('.bookmark-item'))) {
    document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
  }
}

function handleDrop(event) {
  event.preventDefault();
  if (!isEditMode || !draggedItemData) return;

  const targetItem = event.target.closest('.bookmark-item');
  document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));

  const sourceCategoryId = draggedItemData.categoryId;
  const sourceBookmarkId = draggedItemData.bookmarkId;

  if (!sourceCategoryId || !sourceBookmarkId) {
    console.error('[Tabvana DND] Missing source category or bookmark ID.');
    draggedItemData = null;
    return;
  }

  const category = tabvanaData.categories.find(c => c.id === sourceCategoryId);
  if (!category || !category.bookmarks) {
    console.error('[Tabvana DND] Source category not found or has no bookmarks.');
    draggedItemData = null;
    return;
  }

  const draggedBookmarkIndex = category.bookmarks.findIndex(b => b.id === sourceBookmarkId);
  if (draggedBookmarkIndex === -1) {
    console.error('[Tabvana DND] Dragged bookmark not found in source category.');
    draggedItemData = null;
    return;
  }

  const [draggedBookmark] = category.bookmarks.splice(draggedBookmarkIndex, 1);

  if (targetItem && targetItem.dataset.bookmarkId !== sourceBookmarkId) {
    const targetBookmarkId = targetItem.dataset.bookmarkId;
    const targetIndex = category.bookmarks.findIndex(b => b.id === targetBookmarkId);
    if (targetIndex !== -1) {
      // Determine if dropping before or after target based on mouse position relative to target's midpoint?
      // For simplicity, let's insert before the target for now.
      // A more refined approach: check event.clientY against targetItem.getBoundingClientRect().top + targetItem.offsetHeight / 2
      const rect = targetItem.getBoundingClientRect();
      const isAfter = event.clientY > rect.top + rect.height / 2;
      if (isAfter) {
        category.bookmarks.splice(targetIndex + 1, 0, draggedBookmark);
      } else {
        category.bookmarks.splice(targetIndex, 0, draggedBookmark);
      }
    } else {
      // Target item not in the same category's current bookmark list (should not happen if logic is correct)
      // Fallback: add to end
      category.bookmarks.push(draggedBookmark);
    }
  } else {
    // Dropped on itself (should be caught by !== sourceBookmarkId) or in an empty area of the grid
    // Add to the end if not dropped on a specific valid target
    category.bookmarks.push(draggedBookmark);
  }

  console.log(`[Tabvana DND] Dropped ${sourceBookmarkId} in category ${sourceCategoryId}. New order:`, category.bookmarks);
  saveData();
  renderCurrentView(); // Re-render to show new order and clear draggable states etc.
  draggedItemData = null;
}

function renderEmptyState(container, message) {
  console.log(`[Tabvana] renderEmptyState called for container ${container?.id} with message: "${message}"`);
  if (!container) return;
  
  // Set the message directly, styling/centering handled by CSS on container and message class
  container.innerHTML = `<p class="empty-grid-message">${message}</p>`; 
  
  // Ensure the container has flex properties for centering (applied via CSS now)
  // container.style.display = 'flex'; 
  // container.style.alignItems = 'center';
  // container.style.justifyContent = 'center';
}

// --- NEW: Delegated Event Handlers for Edit Mode ---

function handleGridEditClick(event) {
    // Check if the click was on an editable icon
    const iconElement = event.target.closest('.editable-icon');
    if (iconElement) {
        const itemElement = iconElement.closest('.bookmark-item');
        if (itemElement) {
            event.preventDefault(); // Prevent link navigation
            const bookmarkId = itemElement.dataset.bookmarkId;
            const categoryId = itemElement.dataset.categoryId;
            if (bookmarkId && categoryId) {
                console.log(`[Tabvana Edit] Icon clicked for BM: ${bookmarkId} in Cat: ${categoryId}`);
                handleEditBookmarkIcon(categoryId, bookmarkId); 
            }
        }
    }
    // Could add checks for other clickable elements in edit mode here
}

function handleGridEditBlur(event) {
    // Check if the blur event happened on an editable title span
    const titleElement = event.target.closest('.editable-title');
    if (titleElement && titleElement.isContentEditable) { 
        const itemElement = titleElement.closest('.bookmark-item');
        if (itemElement) {
            const bookmarkId = itemElement.dataset.bookmarkId;
            const categoryId = itemElement.dataset.categoryId;
            const newTitle = titleElement.textContent.trim();

            if (bookmarkId && categoryId) {
                console.log(`[Tabvana Edit] Title blurred for BM: ${bookmarkId} in Cat: ${categoryId}. New title: "${newTitle}"`);
                // Find the bookmark and update if the title actually changed
                const category = tabvanaData.categories.find(c => c.id === categoryId);
                if (category && category.bookmarks) {
                    const bookmark = category.bookmarks.find(b => b.id === bookmarkId);
                    if (bookmark && bookmark.title !== newTitle && newTitle) { // Save only if changed and not empty
                        bookmark.title = newTitle;
                        saveData(); // Save the change
                        console.log(`[Tabvana Edit] Title updated and saved for BM: ${bookmarkId}`);
                        // Maybe add visual feedback?
                    } else if (!newTitle) {
                        // Title was cleared, revert maybe? Or handle as error?
                        console.warn(`[Tabvana Edit] Title was cleared for BM: ${bookmarkId}. Reverting.`);
                        titleElement.textContent = bookmark.title; // Revert
                    }
                }
            }
        }
    }
}

function handleGridEditKeydown(event) {
    // Check if Enter key was pressed on an editable title
    const titleElement = event.target.closest('.editable-title');
    if (titleElement && titleElement.isContentEditable && event.key === 'Enter') {
        event.preventDefault(); // Prevent adding a newline
        titleElement.blur(); // Trigger the blur event to save the title
    }
}

// === Add the missing weather display functions ===

function displayForecast(data) {
    if (!forecastContent || !forecastDisplay) return;
    // Basic formatting - enhance as needed
    let html = '';
    if (data.current_weather) {
        const cw = data.current_weather;
        const tempUnit = tabvanaData.temperatureUnit === 'imperial' ? '°F' : '°C';
        // TODO: Add weather icon based on cw.weathercode
        html += `<p><strong>Now:</strong> ${Math.round(cw.temperature)}${tempUnit}, Wind: ${cw.windspeed} km/h</p>`; // Use appropriate wind unit
    }
    if (data.daily) {
        html += '<h5>Daily Forecast:</h5>';
        const daily = data.daily;
        for (let i = 0; i < daily.time.length; i++) {
            const date = new Date(daily.time[i]);
            const day = date.toLocaleDateString(undefined, { weekday: 'short' });
            const maxTemp = Math.round(daily.temperature_2m_max[i]);
            const minTemp = Math.round(daily.temperature_2m_min[i]);
            const tempUnit = tabvanaData.temperatureUnit === 'imperial' ? '°F' : '°C';
            const precipProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : null; // Get probability
            
            let dailyHtml = `${day}: ${minTemp}${tempUnit} / ${maxTemp}${tempUnit}`;
            if (precipProb !== null) {
                dailyHtml += ` (${precipProb}% rain)`; // Add probability text
            }
            // TODO: Add weather icon based on daily.weathercode[i]
            html += `<p>${dailyHtml}</p>`;
        }
    }
    forecastContent.innerHTML = html || '<p>No forecast data available.</p>';
    forecastDisplay.style.display = 'block'; // Show the forecast display
}

function hideForecast() {
    if (forecastDisplay) {
        forecastDisplay.style.display = 'none';
    }
}

// === End Weather Functionality ===

// === NEW Function to handle clicking the weather display ===
async function handleWeatherDisplayClick() {
  if (!tabvanaData.latitude || !tabvanaData.longitude) {
    // Optionally, prompt user to set location if not available
    console.warn('[Tabvana Weather] Latitude or longitude not set. Cannot fetch forecast.');
    // Could show a temporary message in forecastDisplay or an alert
    if (forecastDisplay && forecastContent) {
        forecastContent.innerHTML = '<p>Location not set. Please use settings to fetch your location.</p>';
        forecastDisplay.style.display = 'block';
        // Auto-hide after a few seconds
        setTimeout(hideForecast, 3000);
    }
    return;
  }

  if (forecastDisplay && forecastDisplay.style.display === 'block') {
    hideForecast();
    return;
  }

  try {
    console.log(`[Tabvana Weather] Requesting weather for Lat: ${tabvanaData.latitude}, Lon: ${tabvanaData.longitude}, Unit: ${tabvanaData.temperatureUnit}`);
    // Show a loading message
    if (forecastContent) forecastContent.innerHTML = '<p>Loading forecast...</p>';
    if (forecastDisplay) forecastDisplay.style.display = 'block';

    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "getWeatherForecast",
          latitude: tabvanaData.latitude,
          longitude: tabvanaData.longitude,
          tempUnit: tabvanaData.temperatureUnit
        },
        (messageResponse) => {
          if (chrome.runtime.lastError) {
            console.error('[Tabvana Weather] Error sending message to background:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (messageResponse && messageResponse.success) {
            resolve(messageResponse.data);
          } else {
            console.error('[Tabvana Weather] Failed to get weather forecast from background:', messageResponse ? messageResponse.error : 'No response');
            reject(new Error(messageResponse ? messageResponse.error : 'Failed to get weather data'));
          }
        }
      );
    });

    // Store the fresh data in tabvanaData
    if (response && response.current_weather) {
      tabvanaData.currentWeatherSnapshot = response.current_weather;
      tabvanaData.lastFullForecastData = response; // Store the full forecast data
    }

    // Update the header display with the current weather from the fetched data
    if (response && response.current_weather) {
      updateCurrentWeatherDisplay(tabvanaData.temperatureUnit, response.current_weather);
    }
    displayForecast(response); // Display the fetched data

  } catch (error) {
    console.error('[Tabvana Weather] Error in handleWeatherDisplayClick:', error);
    if (forecastContent) {
        forecastContent.innerHTML = '<p>Could not load weather forecast. See console for details.</p>';
    }
    if (forecastDisplay && forecastDisplay.style.display !== 'block') {
        forecastDisplay.style.display = 'block'; // Ensure it's visible to show the error
    }
    // Optionally auto-hide error after a few seconds
    // setTimeout(hideForecast, 5000);
  }
}

// === Function to refresh the header weather display ===
async function refreshWeatherHeader(forceFetch = false) {
  if (!tabvanaData.latitude || !tabvanaData.longitude) {
    console.log('[Tabvana Weather Refresh] No location data, ensuring placeholder is shown.');
    updateCurrentWeatherDisplay(tabvanaData.temperatureUnit); // Show placeholder with current unit
    return;
  }

  // For simplicity, we'll always re-fetch if called with forceFetch or if no snapshot exists.
  // A more complex version could check a timestamp on currentWeatherSnapshot.
  if (forceFetch || !tabvanaData.currentWeatherSnapshot) {
    console.log(`[Tabvana Weather Refresh] Fetching new weather data. ForceFetch: ${forceFetch}`);
    try {
      const weatherData = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: "getWeatherForecast",
            latitude: tabvanaData.latitude,
            longitude: tabvanaData.longitude,
            tempUnit: tabvanaData.temperatureUnit
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (response && response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response ? response.error : 'Failed to get weather data from background'));
            }
          }
        );
      });

      if (weatherData && weatherData.current_weather) {
        tabvanaData.currentWeatherSnapshot = weatherData.current_weather; // Store for header
        tabvanaData.lastFullForecastData = weatherData; // Store for potential pop-out use
        updateCurrentWeatherDisplay(tabvanaData.temperatureUnit, weatherData.current_weather);
        console.log('[Tabvana Weather Refresh] Header weather updated with new data.');
      } else {
        console.warn('[Tabvana Weather Refresh] Fetched data is missing current_weather.');
        updateCurrentWeatherDisplay(tabvanaData.temperatureUnit); // Fallback to placeholder
      }
    } catch (error) {
      console.error('[Tabvana Weather Refresh] Error fetching weather for header:', error);
      updateCurrentWeatherDisplay(tabvanaData.temperatureUnit); // Fallback to placeholder on error
    }
  } else if (tabvanaData.currentWeatherSnapshot) {
    // We have a snapshot and not forcing fetch, so just update display with existing snapshot
    console.log('[Tabvana Weather Refresh] Using existing weather snapshot for header.');
    updateCurrentWeatherDisplay(tabvanaData.temperatureUnit, tabvanaData.currentWeatherSnapshot);
  }
}

// --- NEW: Function to apply a custom background URL ---
function applyCustomBackground(customUrl) {
  if (backgroundContainerElement && customUrl) {
    backgroundContainerElement.style.backgroundImage = `url('${customUrl}')`;
    backgroundContainerElement.style.backgroundSize = 'cover'; // Ensure it covers
    backgroundContainerElement.style.backgroundPosition = 'center';
    backgroundContainerElement.style.backgroundRepeat = 'no-repeat';
    console.log('[Tabvana Background] Applied custom background:', customUrl);
  } else if (backgroundContainerElement) {
    // Clear custom background if URL is empty/null, effectively reverting to other methods
    backgroundContainerElement.style.backgroundImage = ''; 
    console.log('[Tabvana Background] Custom background URL cleared or invalid.');
  }
}

// --- NEW: Main function to decide and apply background ---
async function applyBackground() {
  if (tabvanaData.customBackgroundDataUri) {
    // Prioritize local file data URI
    applyCustomBackground(tabvanaData.customBackgroundDataUri);
  } else if (tabvanaData.customBackgroundUrl) {
    // Fallback to URL
    applyCustomBackground(tabvanaData.customBackgroundUrl);
  } else if (tabvanaData.unsplashApiKey) {
    // Fallback to Unsplash
    if (backgroundContainerElement) backgroundContainerElement.style.backgroundImage = '';
    setUnsplashBackground(backgroundContainerElement, tabvanaData.unsplashApiKey, tabvanaData.unsplashTheme, tabvanaData.unsplashQuality);
  } else {
    // No custom URL and no Unsplash key, clear any background image (or set a default color/pattern if desired)
    if (backgroundContainerElement) backgroundContainerElement.style.backgroundImage = '';
    console.log('[Tabvana Background] No custom URL or Unsplash API key. Background cleared.');
    // Optionally set a default local background or color here
    // backgroundContainerElement.style.backgroundColor = '#333'; 
  }
}

// --- Custom Background Logic ---
async function handleSetCustomBackground() {
  const newUrl = customBackgroundUrlInput.value.trim();
  if (newUrl) {
    // Basic validation: check if it looks like a URL (very simple check)
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      alert('Please enter a valid URL starting with http:// or https://');
      return;
    }
    tabvanaData.customBackgroundUrl = newUrl;
    tabvanaData.customBackgroundDataUri = null; // Clear data URI when setting URL
    if (localFileNameDisplay) localFileNameDisplay.textContent = ''; // Clear file name display
  } else {
    // If input is empty, effectively clearing it (let clear button handle full clear)
    //tabvanaData.customBackgroundUrl = null;
    alert("Please enter a URL or choose a local file."); // Inform user input is empty
    return; // Don't proceed if URL is empty
  }
  await saveData();
  await applyBackground(); // Re-apply to show the new/cleared custom background or Unsplash
  // Update input field just in case (e.g. if cleared via empty input)
  customBackgroundUrlInput.value = tabvanaData.customBackgroundUrl || ''; 
  alert('Custom background updated!');
}

async function handleClearCustomBackground() {
  customBackgroundUrlInput.value = ''; // Clear input field
  if (localFileNameDisplay) localFileNameDisplay.textContent = ''; // Clear file name display
  tabvanaData.customBackgroundUrl = null;
  tabvanaData.customBackgroundDataUri = null; // Clear data URI as well
  await saveData();
  await applyBackground(); // Re-apply (will use Unsplash or default)
  alert('Custom background cleared. Unsplash background (if configured) will now be used.');
}

// === Category & Bookmark Management Logic (Settings Panel) ===
// ... existing code ...

// NEW: Handle Local File Selection
async function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) {
    if (localFileNameDisplay) localFileNameDisplay.textContent = '';
    return;
  }

  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    if (localFileNameDisplay) localFileNameDisplay.textContent = '';
    // Clear the input value so the same file can be selected again if needed after error
    event.target.value = null; 
    return;
  }

  // Display filename
  if (localFileNameDisplay) localFileNameDisplay.textContent = file.name;

  // Read file as Data URI
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUri = e.target.result;
    // Basic check for very large files (e.g., > 5MB) - Chrome storage limit is 5MB per item by default
    if (dataUri.length > 5 * 1024 * 1024) {
      alert('Warning: Image file is very large (> 5MB) and may not save correctly or may slow down the browser.');
      // Proceeding anyway, but user is warned.
    }
    
    console.log('[Tabvana Background] Local file read as Data URI (length:', dataUri.length, ')');
    tabvanaData.customBackgroundUrl = null; // Clear URL setting
    tabvanaData.customBackgroundDataUri = dataUri; // Store Data URI
    if (customBackgroundUrlInput) customBackgroundUrlInput.value = ''; // Clear URL input field
    
    await saveData();
    await applyBackground(); // Apply the new background
  };
  reader.onerror = (e) => {
    console.error('[Tabvana Background] Error reading local file:', e);
    alert('Error reading the selected file.');
    if (localFileNameDisplay) localFileNameDisplay.textContent = '';
  };
  reader.readAsDataURL(file);

  // Clear the input value so the same file can be selected again if needed
  // event.target.value = null; // Temporarily commented out to debug double-prompt
}

// === Bookmark Sync Logic ===

// Helper to find or create the main sync folder
async function findOrCreateTabvanaSyncFolder() {
  const otherBookmarksId = '2'; // Standard ID for "Other Bookmarks"
  const folderName = "Tabvana Synced";

  try {
    // Search for the folder directly under "Other Bookmarks"
    const results = await chrome.bookmarks.getChildren(otherBookmarksId);
    let syncFolder = results.find(node => node.title === folderName && !node.url); // Check it's a folder

    if (syncFolder) {
      console.log(`[Push Sync] Found existing folder "${folderName}" (ID: ${syncFolder.id})`);
      return syncFolder.id;
    } else {
      console.log(`[Push Sync] Creating folder "${folderName}" under "Other Bookmarks".`);
      const newFolder = await chrome.bookmarks.create({
        parentId: otherBookmarksId,
        title: folderName
      });
      console.log(`[Push Sync] Created folder "${folderName}" (ID: ${newFolder.id})`);
      return newFolder.id;
    }
  } catch (error) {
    console.error(`[Push Sync] Error finding or creating folder "${folderName}":`, error);
    throw error; // Re-throw to be caught by the main handler
  }
}

// Helper to find or create a category sub-folder
async function findOrCreateCategoryFolder(parentFolderId, categoryName) {
   try {
    const results = await chrome.bookmarks.getChildren(parentFolderId);
    let categoryFolder = results.find(node => node.title === categoryName && !node.url);

    if (categoryFolder) {
       return categoryFolder.id;
    } else {
       console.log(`[Push Sync] Creating category folder "${categoryName}" under parent ID ${parentFolderId}.`);
       const newFolder = await chrome.bookmarks.create({
           parentId: parentFolderId,
           title: categoryName
       });
       return newFolder.id;
    }
   } catch (error) {
       console.error(`[Push Sync] Error finding/creating category folder "${categoryName}":`, error);
       throw error;
   }
}

// Main handler function for the push button
async function handlePushBookmarksToBrowser() {
  if (!confirm("This will push your Tabvana categories and bookmarks to a folder named 'Tabvana Synced' in your browser's 'Other Bookmarks'. Existing bookmarks in that folder with the same URL will be skipped. Continue?")) {
    return;
  }

  console.log('[Push Sync] Starting push to browser...');
  let categoriesProcessed = 0;
  let bookmarksCreated = 0;
  let bookmarksSkipped = 0;

  // Disable button during push?
  if (pushTabvanaBookmarksButton) pushTabvanaBookmarksButton.disabled = true;
  const originalButtonText = pushTabvanaBookmarksButton?.textContent;
  if (pushTabvanaBookmarksButton) pushTabvanaBookmarksButton.textContent = 'Pushing...';


  try {
    const tabvanaFolderId = await findOrCreateTabvanaSyncFolder();

    for (const category of tabvanaData.categories) {
      console.log(`[Push Sync] Processing category: "${category.name}"`);
      const categoryFolderId = await findOrCreateCategoryFolder(tabvanaFolderId, category.name);

      if (category.bookmarks && category.bookmarks.length > 0) {
        // Search for existing bookmarks in this target folder *once* for efficiency
        let existingBrowserBookmarks = [];
        try {
            existingBrowserBookmarks = await chrome.bookmarks.getChildren(categoryFolderId);
        } catch (e) {
             console.warn(`[Push Sync] Could not get children for folder ${category.name} (ID: ${categoryFolderId}). Skipping bookmarks inside. Error:`, e);
             continue; // Skip bookmarks for this category if folder reading fails
        }
        const existingUrlsInFolder = new Set(existingBrowserBookmarks.filter(b => b.url).map(b => b.url));
        
        for (const bookmark of category.bookmarks) {
          if (existingUrlsInFolder.has(bookmark.url)) {
            // Skip bookmark if URL already exists in the target browser folder
            // console.log(`[Push Sync] Skipping bookmark "${bookmark.title}" (URL already exists in target folder).`);
            bookmarksSkipped++;
          } else {
            // Create the bookmark in the browser
            try {
              console.log(`[Push Sync] Creating bookmark "${bookmark.title}" in folder "${category.name}".`);
              await chrome.bookmarks.create({
                parentId: categoryFolderId,
                title: bookmark.title,
                url: bookmark.url
              });
              bookmarksCreated++;
            } catch (createError) {
              console.error(`[Push Sync] Failed to create bookmark "${bookmark.title}":`, createError);
              // Decide how to handle failures - skip or stop? Skipping for now.
            }
          }
        }
      }
      categoriesProcessed++;
    }

    alert(`Push complete!\nCategories processed: ${categoriesProcessed}\nBrowser bookmarks created: ${bookmarksCreated}\nBookmarks skipped (URL existed): ${bookmarksSkipped}`);

  } catch (error) {
    console.error('[Push Sync] An error occurred during the push operation:', error);
    alert('An error occurred during the push operation. Check the console for details.');
  } finally {
      // Re-enable button
       if (pushTabvanaBookmarksButton) {
           pushTabvanaBookmarksButton.disabled = false;
           pushTabvanaBookmarksButton.textContent = originalButtonText;
       }
      console.log('[Push Sync] Push operation finished.');
  }
}

// === Category & Bookmark Management Logic (Settings Panel) ===
// ... existing code ...

