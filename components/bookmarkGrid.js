/**
 * Renders bookmarks as a grid within the specified container.
 * @param {HTMLElement} container The DOM element to render the grid into.
 * @param {Array<{id: string, title: string, url: string}>} bookmarks An array of bookmark objects.
 * @returns {HTMLElement | null} The grid element if container was null, otherwise null.
 */
export function renderBookmarkGrid(container, bookmarks, isFavoritesView = false, currentCategoryId = null) {
  console.log(`[renderBookmarkGrid START] Received args: container=${container?.id}, isFavoritesView=${isFavoritesView}, currentCategoryId=${currentCategoryId}`); // Log received args
  // console.log('Rendering bookmark grid into:', container); // Original log, can be removed if too verbose
  // console.log('Bookmarks data:', bookmarks); // Original log, can be removed if too verbose

  // Clear any existing content (important if re-rendering)
  // container.innerHTML = ''; // MOVED: Don't clear if container is null

  const grid = document.createElement('div');
  grid.className = 'bookmark-grid';

  if (!bookmarks || bookmarks.length === 0) {
    // Don't display empty message if it's part of the initial view (handled there)
    if (!container && !isFavoritesView) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = 'No bookmarks in this category.';
        emptyMsg.className = 'empty-grid-message';
        grid.appendChild(emptyMsg);
    }
     // Return the grid even if empty, so the caller can decide what to do
     // or return null if container was specified and grid is empty?
     // Let's return the grid for flexibility.
     // return container ? null : grid;
  } else {
    bookmarks.forEach(bookmark => {
      const item = document.createElement('a');
      item.href = bookmark.url;
      item.className = 'bookmark-item';
      item.title = `${bookmark.title}\n${bookmark.url}`;
      item.target = "_blank"; // Open in new tab
      item.rel = "noopener noreferrer";

      // --- Favorite Toggle Button ---
      const favButton = document.createElement('button');
      favButton.className = 'favorite-toggle-button';
      // Use bookmark.categoryId if available (for favorites view), otherwise use currentCategoryId
      const categoryIdToSet = bookmark.categoryId || currentCategoryId;
      console.log(`[renderBookmarkGrid] For BM ${bookmark.id}: bookmark.categoryId=${bookmark.categoryId}, currentCategoryId=${currentCategoryId}, categoryIdToSet=${categoryIdToSet}`); // Log values
      favButton.dataset.categoryId = categoryIdToSet;
      favButton.dataset.bookmarkId = bookmark.id;
      favButton.title = bookmark.isFavorite ? 'Unmark as Favorite' : 'Mark as Favorite';
      favButton.innerHTML = bookmark.isFavorite ? '&#9733;' : '&#9734;'; // Filled star vs empty star
      if (bookmark.isFavorite) {
        favButton.classList.add('is-favorite');
      }
      // Stop propagation to prevent link navigation when clicking the button
      favButton.addEventListener('click', (e) => {
        e.preventDefault();
        // The actual logic is handled by the grid container's listener in newtab.js
      });
      item.appendChild(favButton);
      // --- End Favorite Toggle ---

      const img = document.createElement('img');
      // Use custom icon if available, otherwise fallback to Google favicon service
      img.src = bookmark.customIconUrl || `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(bookmark.url)}`;
      img.alt = `${bookmark.title} icon`;
      img.onerror = (e) => { 
          // Fallback if custom/Google icon fails (e.g., use a default icon)
          e.target.src = 'assets/icons/default-bookmark.png'; // Make sure this default icon exists
          e.target.onerror = null; // Prevent infinite loop if default fails
      };

      const span = document.createElement('span');
      span.textContent = bookmark.title;

      item.appendChild(img);
      item.appendChild(span);
      grid.appendChild(item);
    });
  }
  
  if (container) {
    // Clear container ONLY if it was provided
    container.innerHTML = ''; 
    container.appendChild(grid);
    return null; // Indicate grid was appended directly
  } else {
    return grid; // Return the created grid element
  }
}

/**
 * Renders a grid for Top Sites.
 * @param {Array<Object>} topSites - Array of Top Site objects from browser.topSites.get().
 * @returns {HTMLElement | null} The grid element or null if no sites.
 */
export function renderTopSitesGrid(topSites) {
    if (!topSites || topSites.length === 0) {
        return null;
    }

    const grid = document.createElement('div');
    grid.className = 'bookmark-grid top-sites-grid'; // Reuse styling, add specific class

    topSites.forEach(site => {
        const item = document.createElement('a');
        item.href = site.url;
        item.className = 'bookmark-item top-site-item'; // Reuse styling, add specific class
        item.title = `${site.title || site.url}\n${site.url}`;
        item.target = "_blank";
        item.rel = "noopener noreferrer";

        const img = document.createElement('img');
        // Use faviconURL if provided by the API, otherwise fallback
        img.src = site.favicon || `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(site.url)}`;
        img.alt = `${site.title || 'Site'} icon`;
        img.onerror = (e) => {
            e.target.src = 'assets/icons/default-bookmark.png'; // Fallback icon
            e.target.onerror = null;
        };

        const span = document.createElement('span');
        span.textContent = site.title || site.url.split('/')[2]; // Use title or domain

        item.appendChild(img);
        item.appendChild(span);
        grid.appendChild(item);
    });

    return grid;
}
