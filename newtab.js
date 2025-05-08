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

function displayWeatherPlaceholder(unit) {
    if (!weatherDisplayElement) return;
    const temp = (unit === 'imperial') ? '64°F' : '18°C';
    weatherDisplayElement.textContent = temp;
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
  
  // If the click wasn't inside a bookmark item at all, do nothing here.
  if (!clickedItem) {
    console.log("[handleBookmarkGridClick] Click outside a bookmark item.");
    return;
  }

  // Click IS inside a bookmark item. Now check edit mode.
  const favoriteButton = event.target.closest('.favorite-toggle-button');

  if (isEditMode) {
    console.log("[handleBookmarkGridClick] Edit mode is active.");
    // If the click was specifically on the favorite button, handle it.
    if (favoriteButton) {
      console.log("[handleBookmarkGridClick] Favorite toggle clicked in edit mode.");
      event.preventDefault(); // Prevent link nav even for fav button
      const bookmarkId = clickedItem.dataset.bookmarkId;
      const categoryId = clickedItem.dataset.categoryId;
      if (bookmarkId && categoryId) {
        handleToggleFavorite(categoryId, bookmarkId);
      }
      return; // Handled favorite toggle
    }

    // For ANY other click within the bookmark item (icon, title, background) 
    // while in edit mode, prevent the default link navigation.
    // Specific edit actions (like icon modal, title blur) are handled by 
    // separate delegated listeners (handleGridEditClick, handleGridEditBlur).
    console.log("[handleBookmarkGridClick] Preventing default link navigation for item click in edit mode.");
    event.preventDefault();
    // No return here, event might bubble further if needed, but default is prevented.

  } else {
    // --- NOT in Edit Mode --- 
    console.log("[handleBookmarkGridClick] Edit mode is NOT active.");
    // If the click was on the favorite button, handle it and prevent navigation.
    if (favoriteButton) {
      console.log("[handleBookmarkGridClick] Favorite toggle clicked in normal mode.");
      event.preventDefault(); // Prevent link nav for fav button
      const bookmarkId = clickedItem.dataset.bookmarkId;
      const categoryId = clickedItem.dataset.categoryId;
      if (bookmarkId && categoryId) {
        handleToggleFavorite(categoryId, bookmarkId);
      } else {
        console.warn("[handleBookmarkGridClick] Missing bookmarkId or categoryId on toggle button.");
      }
    } else {
      // Click was within the item but not on the favorite button - allow default link navigation.
      console.log("[handleBookmarkGridClick] Item click (not fav toggle) in normal mode - allowing navigation.");
    }
  }
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

  // --- Add Event Listeners ---
  setupEventListeners();
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

  // --- Assign Edit Mode Elements ---
  // REMOVE assignment from here: editModeToggleButton = document.getElementById('edit-mode-category-button'); 

  // Initialize UI elements (make sure IDs match HTML)
  timeDisplayElement = document.getElementById('time-display');
  dateDisplayElement = document.getElementById('date-display');
  searchForm = document.getElementById('search-form');
  searchInput = document.getElementById('search-input');
  greetingDisplayElement = document.getElementById('greeting-display');
  bookmarkGridContainer = document.getElementById('bookmark-grid-container');
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
      categories: (storedData[STORAGE_KEY]?.categories || defaultSettings.categories)
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

  if (backgroundContainerElement && typeof setUnsplashBackground === 'function') {
    setUnsplashBackground(backgroundContainerElement, tabvanaData.unsplashApiKey, tabvanaData.unsplashTheme, tabvanaData.unsplashQuality);
  }
  
  applyThemeMode(tabvanaData.themeMode); // Apply theme on load

  if (typeof renderCategoryManagementList === 'function') renderCategoryManagementList();
  if (typeof displayGreeting === 'function') displayGreeting(tabvanaData.userName);
  if (typeof updateTime === 'function') {
    updateTime();
    setInterval(updateTime, 1000 * 30);
  }
  if (typeof updateDate === 'function') updateDate();
  if (typeof displayWeatherPlaceholder === 'function') displayWeatherPlaceholder(tabvanaData.temperatureUnit);

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
  // Category Management
  addCategoryButton.addEventListener('click', handleAddCategory);
  importFirefoxBookmarksButton.addEventListener('click', handleImportBookmarks);
  // Bookmark Management
  addBookmarkButton.addEventListener('click', handleAddBookmark);
  backToCategoriesButton.addEventListener('click', showCategoryManagement);

  // --- Search Form Submission ---
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', handleSearchSubmit);
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
}

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
        themeMode: storedData[STORAGE_KEY]?.themeMode || defaultSettings.themeMode // Load themeMode for prefill
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
  tabvanaData.temperatureUnit = temperatureUnitSelect.value;
  tabvanaData.searchEngine = searchEngineSelect.value;
  tabvanaData.themeMode = themeModeSelect.value; // Save themeMode

  const originalButtonText = saveSettingsButton.textContent;
  saveSettingsButton.disabled = true; // Prevent double-click
  saveSettingsButton.textContent = 'Saving...';

  await saveData(); // Save the entire updated tabvanaData object

  console.log('Settings saved:', tabvanaData);
  saveSettingsButton.textContent = 'Saved!';

  // Update UI based on new settings
  displayGreeting(tabvanaData.userName);
  if (backgroundContainerElement) {
    setUnsplashBackground(backgroundContainerElement, tabvanaData.unsplashApiKey, tabvanaData.unsplashTheme, tabvanaData.unsplashQuality);
  }
  displayWeatherPlaceholder(tabvanaData.temperatureUnit);
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
    console.log('Starting selective import for folders:', folderIds);
    let importedBookmarkCount = 0;
    let categoriesAdded = 0;
    let categoriesMerged = 0;
    let bookmarksToAdd = []; // Declare bookmarksToAdd here, outside the loop

    // Helper function to recursively extract bookmarks
    async function extractBookmarksRecursive(folderNode, currentCategoryName, currentBookmarksArray) {
        if (!folderNode.children) return;

        for (const child of folderNode.children) {
            if (child.url && !child.url.startsWith('javascript:')) { 
                currentBookmarksArray.push({
                    id: generateId(),
                    title: child.title || 'Untitled Bookmark',
                    url: child.url,
                    customIconUrl: null
                });
                importedBookmarkCount++; // This can remain global to the outer function
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
            bookmarksToAdd = []; // Reset for each new top-level selected folder being processed

            console.log(`Extracting bookmarks from selected folder: "${categoryName}" (ID: ${folderId})`);
            await extractBookmarksRecursive(folderNode, categoryName, bookmarksToAdd); // Pass the fresh array

            if (bookmarksToAdd.length > 0) {
                let existingCategory = tabvanaData.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());

                if (existingCategory) {
                    console.log(`Merging ${bookmarksToAdd.length} bookmarks into existing category "${categoryName}".`);
                    const existingUrls = new Set(existingCategory.bookmarks.map(b => b.url));
                    const uniqueNewBookmarks = bookmarksToAdd.filter(b => !existingUrls.has(b.url));
                    if (uniqueNewBookmarks.length < bookmarksToAdd.length) {
                         console.log(`Skipped ${bookmarksToAdd.length - uniqueNewBookmarks.length} duplicate bookmarks based on URL.`);
                    }
                    existingCategory.bookmarks = existingCategory.bookmarks.concat(uniqueNewBookmarks);
                    if (uniqueNewBookmarks.length > 0) categoriesMerged++;
                } else {
                    console.log(`Adding new category "${categoryName}" with ${bookmarksToAdd.length} bookmarks.`);
                    tabvanaData.categories.push({
                        id: generateId(),
                        name: categoryName,
                        bookmarks: bookmarksToAdd
                    });
                    categoriesAdded++;
                }
            } else {
                console.log(`Selected folder "${categoryName}" (and its subfolders) contained no direct bookmarks to import or only duplicates.`);
            }
        }

        if (categoriesAdded > 0 || categoriesMerged > 0) {
            renderCategoryManagementList();
            renderCategoriesBar();
            await saveData();
            alert(`Import complete!\nBookmarks added/merged: ${importedBookmarkCount}\nNew categories created: ${categoriesAdded}\nCategories updated: ${categoriesMerged}`);
        } else {
            alert('Import finished. No new bookmarks were added (folders might have been empty or contained only duplicates/subfolders).');
        }
        console.log('Selective bookmark import finished.');

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
  document.body.classList.toggle('edit-mode-active', isEditMode);

  // Update the button's title hint
  if (editModeToggleButton) { 
    if (isEditMode) {
      editModeToggleButton.title = "Exit Edit Mode & Save Changes";
      // Change icon appearance or button background via CSS class body.edit-mode-active
      // No need to change icon src if we style the button background based on body class
    } else {
      editModeToggleButton.title = "Toggle Edit Mode";
      // Save any pending changes when exiting edit mode
      saveData();
    }
  } else {
    console.error('[Tabvana] ToggleEditMode: Edit mode button not found!');
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
    if (currentCategoryId) {
      item.dataset.categoryId = currentCategoryId;
    }

    const favButton = document.createElement('button');
    favButton.textContent = bookmark.isFavorite ? '★' : '☆';
    favButton.title = bookmark.isFavorite ? 'Remove from favorites' : 'Add to favorites';
    favButton.className = 'favorite-toggle-button';
    favButton.onclick = () => handleToggleFavorite(currentCategoryId, bookmark.id);

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
    case 'category':
      if (currentCategory && currentCategory.bookmarks) {
        renderBookmarkGrid(container, currentCategory.bookmarks, false, currentCategory.id, isEditMode);
      } else {
        renderEmptyState(container, "Category empty or not found.");
      }
      break;
    case 'favorites':
      const favorites = getAllFavoriteBookmarks();
      renderBookmarkGrid(container, favorites, true, null, isEditMode);
      break;
    case 'search':
      if (currentSearchResults && currentSearchResults.length > 0) {
        renderBookmarkGrid(container, currentSearchResults, false, null, isEditMode); 
      } else {
        renderEmptyState(container, "No search results.");
      }
      break;
    case 'initial':
    default:
      console.log(`[Tabvana] renderCurrentView - Case 'initial' (default). showTopSites: ${tabvanaData.showTopSites}, topSitesCache count: ${topSitesCache ? topSitesCache.length : '0 or undefined'}`);
      if (tabvanaData.showTopSites && topSitesCache && topSitesCache.length > 0) {
        // --- Add Header for Top Sites --- 
        const topSitesHeader = document.createElement('h3');
        topSitesHeader.textContent = 'Most Visited';
        topSitesHeader.className = 'grid-section-header';
        container.appendChild(topSitesHeader); // Append header to the main container first
        // --- End Header ---
        renderTopSitesGrid(container, topSitesCache, isEditMode); // Now render the grid itself
      } else {
        if (!tabvanaData.showTopSites) {
          renderEmptyState(container, "Top Sites are disabled. You can enable them in Settings.");
        } else if (!topSitesCache || topSitesCache.length === 0) {
          renderEmptyState(container, "No Top Sites to display. They will appear as you browse.");
        } else {
           renderEmptyState(container, "Welcome! Select a category or add bookmarks via Settings.");
        }
      }
      break;
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
  container.innerHTML = `<p class="empty-grid-message">${message}</p>`;
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

