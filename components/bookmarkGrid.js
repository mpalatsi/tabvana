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
      favButton.textContent = bookmark.isFavorite ? '★' : '☆'; // Use textContent with Unicode
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
      const googleFaviconBase = 'https://www.google.com/s2/favicons?sz=64&domain_url=';
      const localFallbackSrc = chrome.runtime.getURL('assets/icons/default-favicon.png');
      const domainUrl = bookmark.url;

      img.alt = (bookmark.title || "Bookmark") + " icon";
      let primaryIconSrc = bookmark.customIconUrl;

      const setLocalFallback = () => {
        if (img.src !== localFallbackSrc) {
          console.log(`[Tabvana] Setting local fallback for ${domainUrl}`);
          img.src = localFallbackSrc;
          img.onerror = null;
          img.onload = null;
        }
      };

      const tryGoogleFaviconService = () => {
        const googleSrc = googleFaviconBase + encodeURIComponent(domainUrl);
        console.log(`[Tabvana] Trying Google Favicon service for ${domainUrl}: ${googleSrc}`);
        img.src = googleSrc;
        img.onload = () => {
          // If Google service returns an invalid image or one that is suspiciously small (e.g., default 16x16 globe when we asked for 64)
          if (!img.complete || typeof img.naturalWidth === "undefined" || img.naturalWidth === 0 || img.naturalWidth < 32) { 
            console.log(`[Tabvana] Google Favicon for ${domainUrl} (${img.src}) seems invalid/tiny (dims: ${img.naturalWidth}x${img.naturalHeight}). Setting local fallback.`);
            setLocalFallback();
          } else {
            console.log(`[Tabvana] Google Favicon for ${domainUrl} loaded successfully (dims: ${img.naturalWidth}x${img.naturalHeight}).`);
            img.onload = null;
          }
        };
        img.onerror = () => {
          console.log(`[Tabvana] Error loading Google Favicon for ${domainUrl}. Setting local fallback.`);
          setLocalFallback();
        };
      };

      if (primaryIconSrc) {
        console.log(`[Tabvana] Trying primary icon for ${domainUrl}: ${primaryIconSrc}`);
        img.src = primaryIconSrc;
        img.onload = () => {
          if (!img.complete || typeof img.naturalWidth === "undefined" || img.naturalWidth === 0 || img.naturalWidth <= 2) {
            console.log(`[Tabvana] Primary icon ${primaryIconSrc} for ${domainUrl} invalid/tiny. Trying Google Favicon service.`);
            tryGoogleFaviconService();
          } else {
            console.log(`[Tabvana] Primary icon ${primaryIconSrc} for ${domainUrl} loaded successfully.`);
            img.onload = null;
          }
        };
        img.onerror = () => {
          console.log(`[Tabvana] Error loading primary icon ${primaryIconSrc} for ${domainUrl}. Trying Google Favicon service.`);
          tryGoogleFaviconService();
        };
      } else {
        tryGoogleFaviconService();
      }
      // Ensure NO old onerror is lingering here for the renderBookmarkGrid img

      const span = document.createElement('span');
      span.textContent = bookmark.title || bookmark.url;
      item.appendChild(img);
      item.appendChild(span);
      grid.appendChild(item);
    });
  }
  
  if (container) {
    // Clear container ONLY if it was provided using a safer method
    // container.innerHTML = ''; 
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    container.appendChild(grid);
    return null; // Indicate grid was appended directly
  } else {
    return grid; // Return the created grid element
  }
}

/**
 * Renders a grid for Top Sites.
 * @param {Array<Object>} topSites - Array of Top Site objects from chrome.topSites.get().
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
        const googleFaviconBase = 'https://www.google.com/s2/favicons?sz=64&domain_url='; // Renamed for local scope
        const localFallbackSrc = chrome.runtime.getURL('assets/icons/default-favicon.png'); // Renamed for local scope
        const domainUrl = site.url; // Use site.url here

        img.alt = (site.title || 'Site') + " icon";
        let primaryIconSrc = site.favicon; // Use site.favicon for top sites

        const setLocalFallback = () => { // Renamed for local scope
          if (img.src !== localFallbackSrc) {
            console.log(`[Tabvana] Setting local fallback for top site ${domainUrl}`);
            img.src = localFallbackSrc;
            img.onerror = null;
            img.onload = null;
          }
        };

        const tryGoogleFaviconService = () => { // Renamed for local scope
          const googleSrc = googleFaviconBase + encodeURIComponent(domainUrl);
          console.log(`[Tabvana] Trying Google Favicon service for top site ${domainUrl}: ${googleSrc}`);
          img.src = googleSrc;
          img.onload = () => {
            // If Google service returns an invalid image or one that is suspiciously small
            if (!img.complete || typeof img.naturalWidth === "undefined" || img.naturalWidth === 0 || img.naturalWidth < 32) {
              console.log(`[Tabvana] Google Favicon for top site ${domainUrl} (${img.src}) seems invalid/tiny (dims: ${img.naturalWidth}x${img.naturalHeight}). Setting local fallback.`);
              setLocalFallback();
            } else {
              console.log(`[Tabvana] Google Favicon for top site ${domainUrl} loaded successfully (dims: ${img.naturalWidth}x${img.naturalHeight}).`);
              img.onload = null;
            }
          };
          img.onerror = () => {
            console.log(`[Tabvana] Error loading Google Favicon for top site ${domainUrl}. Setting local fallback.`);
            setLocalFallback();
          };
        };

        if (primaryIconSrc) {
          console.log(`[Tabvana] Trying primary icon for top site ${domainUrl}: ${primaryIconSrc}`);
          img.src = primaryIconSrc;
          img.onload = () => {
            if (!img.complete || typeof img.naturalWidth === "undefined" || img.naturalWidth === 0 || img.naturalWidth <= 2) {
              console.log(`[Tabvana] Primary top site icon ${primaryIconSrc} for ${domainUrl} invalid/tiny. Trying Google Favicon service.`);
              tryGoogleFaviconService();
            } else {
              console.log(`[Tabvana] Primary top site icon ${primaryIconSrc} for ${domainUrl} loaded successfully.`);
              img.onload = null;
            }
          };
          img.onerror = () => {
            console.log(`[Tabvana] Error loading primary top site icon ${primaryIconSrc} for ${domainUrl}. Trying Google Favicon service.`);
            tryGoogleFaviconService();
          };
        } else {
          tryGoogleFaviconService();
        }
        // Ensure NO old onerror is lingering here for the renderTopSitesGrid img

        const span = document.createElement('span');
        span.textContent = site.title || site.url.split('/')[2];
        item.appendChild(img);
        item.appendChild(span);
        grid.appendChild(item);
    });

    return grid;
}
