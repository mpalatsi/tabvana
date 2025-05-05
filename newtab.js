// No longer importing bookmarkGrid initially
// import { renderBookmarkGrid } from './components/bookmarkGrid.js';
import { setUnsplashBackground } from './components/unsplashBackground.js';
import { renderBookmarkGrid, renderTopSitesGrid } from './components/bookmarkGrid.js';

console.log('FoxBoard newtab.js loaded');

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
    const category = foxboardData.categories.find(c => c.id === categoryId);
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
// MOVED EARLIER (depends on handleToggleFavorite)
function handleBookmarkGridClick(event) {
  console.log("[handleBookmarkGridClick] Grid click detected."); // Log grid click
  const toggleButton = event.target.closest('.favorite-toggle-button');
  if (toggleButton) {
    console.log("[handleBookmarkGridClick] Favorite toggle button found:", toggleButton);
    const bookmarkId = toggleButton.dataset.bookmarkId;
    const categoryId = toggleButton.dataset.categoryId; // Get category ID from button
    console.log(`[handleBookmarkGridClick] Bookmark ID: ${bookmarkId}, Category ID: ${categoryId}`);
    if (bookmarkId && categoryId) {
      console.log("[handleBookmarkGridClick] Conditions met, attempting to call handleToggleFavorite..."); // Add log here
      handleToggleFavorite(categoryId, bookmarkId);
    } else {
      console.warn("[handleBookmarkGridClick] Missing bookmarkId or categoryId on toggle button.");
    }
  } else {
      console.log("[handleBookmarkGridClick] Click was not on a favorite toggle button.");
  }
}

// === Helper to get all favorite bookmarks ===
// MOVED EARLIER
function getAllFavoriteBookmarks() {
  console.log("[getAllFavs] Starting..."); // Log start
  let favorites = []; 
  try {
      if (!Array.isArray(foxboardData.categories)) {
          console.error("[getAllFavs] foxboardData.categories is not an array!", foxboardData.categories);
          return []; // Return empty array on error
      }
      foxboardData.categories.forEach((category, index) => {
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
const STORAGE_KEY = 'foxboardData';
const defaultSettings = {
    unsplashApiKey: null,
    unsplashTheme: 'nature',
    unsplashQuality: 'Standard',
    userName: '',
    temperatureUnit: 'metric',
    searchEngine: 'duckduckgo',
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
let foxboardData = { ...defaultSettings }; // Initialize with defaults
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

// --- Search Elements ---
let searchForm = null;
let searchInput = null;

// Make the DOMContentLoaded async to use await for storage
document.addEventListener('DOMContentLoaded', async () => {
  console.log('FoxBoard DOM fully loaded and parsed');

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
    searchEngineSelect,
    categoryManagementSection, categoryListElement, newCategoryNameInput, addCategoryButton,
    importFirefoxBookmarksButton,
    bookmarkManagementSection, bookmarkSectionTitle, bookmarkListElement, newBookmarkTitleInput, newBookmarkUrlInput, addBookmarkButton, backToCategoriesButton,
    // --- Check Modal Elements ---
    importModalOverlay, importModal, importFolderList, importSelectAllButton, importSelectNoneButton, importConfirmButton, importCancelButton,
    // Remove Search Elements Check
    searchForm, searchInput
  ];
  if (elements.some(el => !el)) {
    console.error('One or more required page elements not found!');
    return false;
  }
  return true;
}

async function loadDataAndInitializeUI() {
  try {
    const storedData = await browser.storage.local.get(STORAGE_KEY);
    // Merge stored data with defaults, ensuring structure exists
    foxboardData = {
      ...defaultSettings,
      ...(storedData[STORAGE_KEY] || {}),
      // Ensure searchEngine exists in the loaded data
      searchEngine: storedData[STORAGE_KEY]?.searchEngine || defaultSettings.searchEngine,
      // Ensure categories array exists even if storage was empty/malformed
      categories: (storedData[STORAGE_KEY]?.categories || defaultSettings.categories)
    };
    console.log('Loaded data:', foxboardData);
  } catch (error) {
    console.error('Error loading data from storage:', error);
    foxboardData = { ...defaultSettings }; // Fallback to defaults on error
  }

  // Populate the Unsplash theme dropdown
  populateUnsplashThemeDropdown();
  // Populate the Search Engine dropdown
  populateSearchEngineDropdown();

  // Pre-fill General Settings Inputs
  unsplashApiKeyInput.value = foxboardData.unsplashApiKey || '';
  unsplashThemeSelect.value = foxboardData.unsplashTheme || defaultSettings.unsplashTheme;
  unsplashQualitySelect.value = foxboardData.unsplashQuality;
  userNameInput.value = foxboardData.userName;
  temperatureUnitSelect.value = foxboardData.temperatureUnit;
  searchEngineSelect.value = foxboardData.searchEngine;

  // Initial UI Setup
  setUnsplashBackground(backgroundContainerElement, foxboardData.unsplashApiKey, foxboardData.unsplashTheme, foxboardData.unsplashQuality);
  renderCategoriesBar(); // Render bottom bar
  renderCategoryManagementList(); // Render categories in settings
  displayGreeting(foxboardData.userName);
  updateTime();
  setInterval(updateTime, 1000 * 30);
  updateDate();
  displayWeatherPlaceholder(foxboardData.temperatureUnit);

  // NEW: Render initial view (Top Sites + Favorites) if no category was pre-selected
  console.log(`[loadDataAndInitializeUI] Checking condition: !selectedCategoryId. Value: ${selectedCategoryId}`); // Log check
  if (!selectedCategoryId) {
    renderInitialView();
    showingInitialView = true;
  } else {
    handleCategoryClick(selectedCategoryId); // Render the pre-selected category
    showingInitialView = false;
  }
}

function setupEventListeners() {
  // Settings Panel Toggle
  settingsToggleButton.addEventListener('click', toggleSettingsPanel);
  settingsCloseButton.addEventListener('click', toggleSettingsPanel);
  // Save All Settings
  saveSettingsButton.addEventListener('click', handleSaveSettings);
  // Category Management
  addCategoryButton.addEventListener('click', handleAddCategory);
  importFirefoxBookmarksButton.addEventListener('click', handleImportFirefoxBookmarks);
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

  // Main Category Bar Clicks
  categoryBarElement.addEventListener('click', (event) => {
    const clickedElement = event.target;
    const targetButton = clickedElement.closest('.category-item'); 
    console.log("[Category Bar Listener] Click detected on target:", clickedElement, "Closest button:", targetButton);

    // Handle direct click on home button OR its parent having the ID
    if (clickedElement.id === 'home-category-button' || targetButton?.id === 'home-category-button') { 
        console.log("[Category Bar Listener] Home button identified.");
        console.log(`[Category Bar Listener] Current showingInitialView state: ${showingInitialView}`);
        if (!showingInitialView) { 
            console.log("[Category Bar Listener] Calling renderInitialView...");
            renderInitialView();
            console.log("[Category Bar Listener] renderInitialView called.");
        } else {
            console.log("[Category Bar Listener] Already showing initial view, doing nothing.");
        }
    // Handle click on other category items (ensure it's not the home button)
    } else if (targetButton && targetButton.dataset.categoryId) { 
        const categoryId = targetButton.dataset.categoryId;
        console.log(`[Category Bar Listener] Target button ID: ${targetButton.id}`); // Log the button ID
        console.log(`[Category Bar Click] Category button clicked: ${categoryId}`);
        if (selectedCategoryId !== categoryId) { 
             handleCategoryClick(categoryId);
        }
    } else {
        console.log("[Category Bar Listener] Click was not on a recognized button.");
    }
  });

  // NEW: Add listener for clicks within the bookmark grid (for favorite toggles)
  console.log('[setupEventListeners] Checking bookmarkGridContainer:', bookmarkGridContainer); // Log element check
  if (bookmarkGridContainer) {
    bookmarkGridContainer.addEventListener('click', handleBookmarkGridClick); // NOW handleBookmarkGridClick should be defined
    console.log('[setupEventListeners] Added click listener to bookmarkGridContainer.'); // Confirm listener added
  } else {
    console.warn('[setupEventListeners] Bookmark grid container NOT found, cannot add favorite toggle listener.');
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

    const engineKey = foxboardData.searchEngine; // Get from loaded data
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
    await browser.storage.local.set({ [STORAGE_KEY]: foxboardData });
    console.log('Data saved successfully.');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// --- Category Bar Rendering (Bottom Bar) ---
function renderCategoriesBar() {
  if (!categoryBarElement) return;
  categoryBarElement.innerHTML = ''; // Clear existing

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

  foxboardData.categories.forEach(category => {
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
}

// --- Settings Panel UI Rendering ---
function renderCategoryManagementList() {
  if (!categoryListElement) return;
  categoryListElement.innerHTML = ''; // Clear list

  foxboardData.categories.forEach(category => {
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
    const storedData = await browser.storage.local.get(STORAGE_KEY);
    const currentData = {
        ...defaultSettings, 
        ...(storedData[STORAGE_KEY] || {}),
        // Ensure searchEngine is included when prefilling
        searchEngine: storedData[STORAGE_KEY]?.searchEngine || defaultSettings.searchEngine 
    };
    unsplashApiKeyInput.value = currentData.unsplashApiKey || '';
    unsplashThemeSelect.value = currentData.unsplashTheme || defaultSettings.unsplashTheme;
    unsplashQualitySelect.value = currentData.unsplashQuality;
    userNameInput.value = currentData.userName;
    temperatureUnitSelect.value = currentData.temperatureUnit;
    searchEngineSelect.value = currentData.searchEngine;
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

  foxboardData.categories.push(newCategory);
  newCategoryNameInput.value = ''; // Clear input
  renderCategoryManagementList(); // Re-render list in settings
  renderCategoriesBar(); // Re-render bottom bar
  saveData(); // Persist changes
}

function handleDeleteCategory(categoryId) {
  const category = foxboardData.categories.find(c => c.id === categoryId);
  if (!category) return;

  // Confirmation
  if (!confirm(`Are you sure you want to delete the category "${category.name}" and all its bookmarks?`)) {
    return;
  }

  foxboardData.categories = foxboardData.categories.filter(c => c.id !== categoryId);
  renderCategoryManagementList();
  renderCategoriesBar();
  saveData();
}

// TODO: handleRenameCategory
function handleRenameCategory(categoryId) {
    const category = foxboardData.categories.find(c => c.id === categoryId);
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
  const category = foxboardData.categories.find(c => c.id === categoryId);
  if (!category) return;

  categoryManagementSection.style.display = 'none';
  bookmarkManagementSection.style.display = 'block';
  bookmarkSectionTitle.textContent = `Manage Bookmarks in "${category.name}"`;

  renderBookmarkManagementList(categoryId);
}

function renderBookmarkManagementList(categoryId) {
    const category = foxboardData.categories.find(c => c.id === categoryId);
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

    const category = foxboardData.categories.find(c => c.id === selectedCategoryForManagement);
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
    const category = foxboardData.categories.find(c => c.id === categoryId);
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
    const category = foxboardData.categories.find(c => c.id === categoryId);
    if (!category || !category.bookmarks) return;

    const bookmark = category.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    const currentIconUrl = bookmark.customIconUrl || '';
    const newIconUrlInput = prompt(`Enter new icon URL for "${bookmark.title}" (leave blank to clear custom icon):`, currentIconUrl);

    if (newIconUrlInput === null) {
        return; // User cancelled
    }

    const newIconUrl = newIconUrlInput.trim();

    if (newIconUrl === currentIconUrl) {
        return; // No change
    }

    if (newIconUrl) {
        // Basic validation: check if it looks like a URL (starts with http/https)
        if (!newIconUrl.startsWith('http://') && !newIconUrl.startsWith('https://')) {
            alert('Invalid URL. Please enter a valid image URL starting with http:// or https://, or leave blank to clear.');
            return;
        }
         // You could add more robust URL validation or image checking here if needed
        bookmark.customIconUrl = newIconUrl;
        console.log(`Custom icon URL set for "${bookmark.title}": ${newIconUrl}`);
    } else {
        bookmark.customIconUrl = null; // Clear the custom icon
        console.log(`Custom icon URL cleared for "${bookmark.title}".`);
    }

    // Re-render list in settings (to reflect potential change) and save
    renderBookmarkManagementList(categoryId);
    // Re-render main view if this category is currently selected
    if (selectedCategoryId === categoryId) {
        handleCategoryClick(categoryId); // Re-render the main grid
    }
    saveData();
}
// --- End New Function ---

// TODO: handleEditBookmark
function handleEditBookmark(categoryId, bookmarkId) {
    const category = foxboardData.categories.find(c => c.id === categoryId);
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
  // Update general settings in foxboardData object
  foxboardData.unsplashApiKey = unsplashApiKeyInput.value.trim() || null;
  foxboardData.unsplashTheme = unsplashThemeSelect.value;
  foxboardData.unsplashQuality = unsplashQualitySelect.value;
  foxboardData.userName = userNameInput.value.trim() || '';
  foxboardData.temperatureUnit = temperatureUnitSelect.value;
  foxboardData.searchEngine = searchEngineSelect.value;

  const originalButtonText = saveSettingsButton.textContent;
  saveSettingsButton.disabled = true; // Prevent double-click
  saveSettingsButton.textContent = 'Saving...';

  await saveData(); // Save the entire updated foxboardData object

  console.log('Settings saved:', foxboardData);
  saveSettingsButton.textContent = 'Saved!';

  // Update UI based on new settings
  displayGreeting(foxboardData.userName);
  if (backgroundContainerElement) {
    setUnsplashBackground(backgroundContainerElement, foxboardData.unsplashApiKey, foxboardData.unsplashTheme, foxboardData.unsplashQuality);
  }
  displayWeatherPlaceholder(foxboardData.temperatureUnit);

  // Reset button after a delay
  setTimeout(() => {
    saveSettingsButton.textContent = originalButtonText;
    saveSettingsButton.disabled = false;
  }, 1500);
}

// === Main View Logic (Displaying Content) ===

function handleCategoryClick(categoryId) {
    if (!mainContentElement) return;

    console.log(`Category selected: ${categoryId}`);
    selectedCategoryId = categoryId; // Update selected state for main view
    showingInitialView = false; // No longer showing initial view
    console.log("[handleCategoryClick] Set showingInitialView to:", showingInitialView); // Log state change

    // Clear only the bookmark area
    console.log("[handleCategoryClick] Clearing main content...");
    clearMainContent();

    // Find the category data
    const category = foxboardData.categories.find(c => c.id === categoryId);
    const bookmarkContainer = document.getElementById('bookmark-grid-container'); // Get the dedicated container

    if (category && category.bookmarks && bookmarkContainer) {
        console.log(`[handleCategoryClick] Rendering bookmarks for category: ${category.name}`);
        // Pass categoryId to renderBookmarkGrid for favorite toggling context
        // Explicitly pass categoryId as the 4th argument
        renderBookmarkGrid(bookmarkContainer, category.bookmarks, false, categoryId); 
        // The renderBookmarkGrid now handles appending if container is provided 
        console.log(`[handleCategoryClick] Bookmark grid rendering should be complete.`);

    } else {
        console.warn(`Category data or bookmarks not found for ID: ${categoryId}, or container missing.`);
        if (bookmarkContainer) {
             bookmarkContainer.innerHTML = '<p style="margin-top: 5vh;">Error: Could not load bookmarks for this category.</p>'; // Error placeholder in container
        }
    }

    renderCategoriesBar(); // Re-render bar to show active state
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
async function handleImportFirefoxBookmarks() {
    console.log('Opening import selection modal...');
    try {
        const tree = await browser.bookmarks.getTree();
        console.log('Bookmark tree fetched:', tree);

        const topLevelFolders = [];
        const rootNode = tree[0]; // The actual root

        // Common roots for user bookmarks
        const userBookmarkRoots = ['menu________', 'toolbar_____', 'unfiled_____', 'mobile______'];
        // We also want to explicitly exclude the absolute root node itself
        const excludedFolderIDs = ['root________', ...userBookmarkRoots];

        function findUserFolders(node) {
            // Check if the current node is a folder and not one of the excluded roots
            if (node.type === 'folder' && !excludedFolderIDs.includes(node.id)) {
                // Add this folder to the list
                topLevelFolders.push({ id: node.id, title: node.title || 'Untitled Folder' });
            }

            // If the node has children, recursively call findUserFolders for each child
            if (node.children) {
                node.children.forEach(child => {
                    findUserFolders(child);
                });
            }
        }

        findUserFolders(rootNode);
        
        // Filter out duplicates (though unlikely for top-level folders)
        const uniqueFolders = Array.from(new Map(topLevelFolders.map(f => [f.id, f])).values());

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

    try {
        for (const folderId of folderIds) {
            const subTreeNodes = await browser.bookmarks.getSubTree(folderId);
            if (!subTreeNodes || subTreeNodes.length === 0) continue; // Skip if subtree is empty
            
            const folderNode = subTreeNodes[0]; // The root of the subtree is the folder itself
            const categoryName = folderNode.title || 'Untitled Folder';
            const bookmarksToAdd = [];

            if (folderNode.children) {
                folderNode.children.forEach(child => {
                    // Only import direct children that are actual bookmarks with URLs
                    if (child.type === 'bookmark' && child.url && !child.url.startsWith('place:')) {
                        bookmarksToAdd.push({
                            id: generateId(),
                            title: child.title || 'Untitled Bookmark',
                            url: child.url,
                            customIconUrl: null
                        });
                        importedBookmarkCount++;
                    } else if (child.type === 'bookmark') {
                        console.log(`Skipping non-URL or place: bookmark: ${child.title} in ${categoryName}`);
                    }
                    // We are ignoring sub-folders within the selected folder for simplicity
                });
            }

            if (bookmarksToAdd.length > 0) {
                // Check if category already exists (case-insensitive)
                let existingCategory = foxboardData.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());

                if (existingCategory) {
                    console.log(`Merging ${bookmarksToAdd.length} bookmarks into existing category "${categoryName}".`);
                    // Basic merge: just concat. Add duplicate checking if needed.
                     // Simple duplicate check based on URL
                    const existingUrls = new Set(existingCategory.bookmarks.map(b => b.url));
                    const uniqueNewBookmarks = bookmarksToAdd.filter(b => !existingUrls.has(b.url));
                    if (uniqueNewBookmarks.length < bookmarksToAdd.length) {
                         console.log(`Skipped ${bookmarksToAdd.length - uniqueNewBookmarks.length} duplicate bookmarks based on URL.`);
                    }
                    existingCategory.bookmarks = existingCategory.bookmarks.concat(uniqueNewBookmarks);
                    if (uniqueNewBookmarks.length > 0) categoriesMerged++;
                } else {
                    console.log(`Adding new category "${categoryName}" with ${bookmarksToAdd.length} bookmarks.`);
                    foxboardData.categories.push({
                        id: generateId(),
                        name: categoryName,
                        bookmarks: bookmarksToAdd
                    });
                    categoriesAdded++;
                }
            } else {
                console.log(`Selected folder "${categoryName}" contained no direct bookmarks to import.`);
            }
        }

        // Update UI and save if any changes were made
        if (categoriesAdded > 0 || categoriesMerged > 0) {
            renderCategoryManagementList();
            renderCategoriesBar();
            await saveData();
            alert(`Import complete!
Bookmarks added/merged: ${importedBookmarkCount}
New categories created: ${categoriesAdded}
Categories updated: ${categoriesMerged}`);
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
  console.log("[renderInitialView] Starting..."); // Log start
  if (!bookmarkGridContainer) {
    console.error("[renderInitialView] Bookmark grid container not found!");
    return;
  }
  showingInitialView = true;
  selectedCategoryId = null; 
  bookmarkGridContainer.innerHTML = ''; 
  renderCategoriesBar(); 

  const fragment = document.createDocumentFragment();

  // --- Render Favorites --- 
  const favorites = getAllFavoriteBookmarks();
  console.log("[renderInitialView] Fetched favorites:", favorites); // Log favorites
  if (favorites.length > 0) {
    // ... (add header) ...
    console.log("[renderInitialView] Calling renderBookmarkGrid for favorites...");
    const favoritesGrid = renderBookmarkGrid(null, favorites, true); 
    if (favoritesGrid) {
        fragment.appendChild(favoritesGrid);
        console.log("[renderInitialView] Appended favorites grid.");
    } else {
        console.warn("[renderInitialView] renderBookmarkGrid for favorites returned null.");
    }
  }

  // --- Render Top Sites --- 
  try {
    console.log("[renderInitialView] Fetching top sites...");
    const topSites = await browser.topSites.get({ includeFavicon: true, limit: 12 }); 
    console.log("[renderInitialView] Fetched top sites:", topSites);
    if (topSites && topSites.length > 0) {
      // --- Add Header ---
      const topSitesHeader = document.createElement('h3');
      topSitesHeader.textContent = 'Most Visited';
      topSitesHeader.className = 'grid-section-header';
      console.log("[renderInitialView] Appending Top Sites header:", topSitesHeader);
      fragment.appendChild(topSitesHeader);
      // -----------------
      
      console.log("[renderInitialView] Calling renderTopSitesGrid...");
      const topSitesGrid = renderTopSitesGrid(topSites);
      if (topSitesGrid) {
          fragment.appendChild(topSitesGrid);
          console.log("[renderInitialView] Appended top sites grid.");
      } else {
           console.warn("[renderInitialView] renderTopSitesGrid returned null.");
      }
    }
  } catch (error) {
    console.error('[renderInitialView] Error fetching/rendering top sites:', error);
    // ... (display error message) ...
  }

  // ... (handle empty message logic) ...

  console.log("[renderInitialView] Appending fragment to container.");
  bookmarkGridContainer.appendChild(fragment);
  console.log("[renderInitialView] Finished.");
}
