/**
 * Renders bookmarks as a grid within the specified container.
 * @param {HTMLElement} container The DOM element to render the grid into.
 * @param {Array<{id: string, title: string, url: string}>} bookmarks An array of bookmark objects.
 */
export function renderBookmarkGrid(container, bookmarks) {
  console.log('Rendering bookmark grid into:', container);
  console.log('Bookmarks data:', bookmarks);

  // Clear any existing content (important if re-rendering)
  container.innerHTML = '';

  if (!bookmarks || bookmarks.length === 0) {
    container.innerHTML = '<p class="empty-grid-message">No bookmarks in this category.</p>'; // Use class for styling
    return;
  }

  const gridContainer = document.createElement('div');
  gridContainer.className = 'bookmark-grid';

  bookmarks.forEach(bookmark => {
    const bookmarkElement = createBookmarkElement(bookmark);
    gridContainer.appendChild(bookmarkElement);
  });

  container.appendChild(gridContainer);
}

/**
 * Creates a DOM element for a single bookmark item.
 * @param {{id: string, title: string, url: string}} bookmark The bookmark object.
 * @returns {HTMLElement} The created DOM element.
 */
function createBookmarkElement(bookmark) {
  console.log(`[Favicon] Processing URL: ${bookmark.url}`); // Log URL
  const element = document.createElement('a');
  element.href = bookmark.url;
  element.title = `${bookmark.title}\n${bookmark.url}`;
  element.className = 'bookmark-item';
  element.target = '_blank'; // Open in new tab
  element.rel = 'noopener noreferrer'; // Security best practice

  // Favicon
  const faviconImg = document.createElement('img');
  faviconImg.alt = ''; // Decorative image

  const defaultIconPath = 'assets/icons/default-favicon.png';
  let attemptingGoogleFavicon = false; // Flag to know if we should fallback to Google

  // --- Prioritize Custom Icon ---
  if (bookmark.customIconUrl) {
    console.log(`[Favicon] Using custom icon URL: ${bookmark.customIconUrl}`);
    faviconImg.src = bookmark.customIconUrl;
    faviconImg.onerror = () => {
      console.warn(`[Favicon] Custom icon failed to load: ${bookmark.customIconUrl}. Falling back to Google service.`);
      attemptGoogleFavicon(); // Fallback to Google if custom fails
    };
  } else {
    // No custom icon, attempt Google service directly
    attemptGoogleFavicon();
  }
  // --- End Custom Icon Logic ---

  // Function to attempt loading from Google Favicon service
  function attemptGoogleFavicon() {
    let domain = null;
    try {
        const urlObj = new URL(bookmark.url); 
        domain = urlObj.hostname;
        console.log(`[Favicon] Attempting Google Favicon for domain: ${domain}`);
        faviconImg.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`; 
        attemptingGoogleFavicon = true; // Set flag
        // Reset onerror for this specific attempt
        faviconImg.onerror = handleGoogleFaviconError; 
    } catch (e) {
        console.warn(`[Favicon] Invalid URL for Google Favicon service: ${bookmark.url}`, e);
        setFallbackIcon(); // Fallback to default if URL is invalid
    }
  }

  // Specific handler for Google Favicon errors
  function handleGoogleFaviconError() {
    if (attemptingGoogleFavicon) { // Only log failure if we actually tried Google
        const domain = new URL(bookmark.url).hostname; // Re-extract domain for logging
        console.log(`[Favicon] Failed to load from Google service for domain: ${domain}. Using default.`);
    }
    setFallbackIcon();
  }

  // Function to set the final default fallback icon
  function setFallbackIcon() {
      console.log(`[Favicon] Setting default icon for ${bookmark.url}`);
      faviconImg.src = defaultIconPath;
      faviconImg.onerror = null; // Prevent infinite loops if default icon is somehow broken
  }

  element.appendChild(faviconImg);

  // Title Span
  const titleSpan = document.createElement('span');
  titleSpan.textContent = bookmark.title || 'Untitled';

  element.appendChild(titleSpan);

  return element;
}
