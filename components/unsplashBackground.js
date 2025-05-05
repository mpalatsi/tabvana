// IMPORTANT: Replace this with your key ONLY for local testing.
// REMOVE before committing or distributing!
const UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY';

// --- Default Bundled Backgrounds ---
// List of bundled background images available for fallback.
const DEFAULT_BACKGROUNDS = [
  'assets/backgrounds/dario-jud-HXbAioPEVyQ-unsplash.jpg',
  'assets/backgrounds/humphrey-m-30pbE4rxKUc-unsplash.jpg',
  'assets/backgrounds/ingmar-h-SvFFr464urs-unsplash.jpg',
  'assets/backgrounds/daniel-boberg-6PLyWqb-qGI-unsplash.jpg',
  'assets/backgrounds/junel-mujar-BwOhb-GIT8w-unsplash.jpg',
  'assets/backgrounds/colin-watts-a4NEq4bq5Kg-unsplash.jpg',
  'assets/backgrounds/aleksandra-boguslawska-wrVNmL8QSe8-unsplash.jpg',
  'assets/backgrounds/dillon-hunt-zQLd8RXbenw-unsplash.jpg'
];

function setLocalBackground(containerElement) {
  if (DEFAULT_BACKGROUNDS.length === 0) {
    containerElement.style.backgroundColor = '#e0e0e0'; // Simple fallback if no local images
    containerElement.style.backgroundImage = '';
    return;
  }
  const randomIndex = Math.floor(Math.random() * DEFAULT_BACKGROUNDS.length);
  const localImageUrl = browser.runtime.getURL(DEFAULT_BACKGROUNDS[randomIndex]);
  console.log(`Setting local background: ${localImageUrl}`);
  containerElement.style.backgroundImage = `url('${localImageUrl}')`;
  containerElement.style.backgroundColor = ''; // Remove fallback color
}

/**
 * Sets a random background image, using Unsplash API if key is provided,
 * otherwise uses a bundled local image.
 * @param {HTMLElement} containerElement The element to set the background image on.
 * @param {string | null} apiKey The Unsplash Access Key (Client-ID) or null/undefined.
 * @param {string} category Optional category/query for the Unsplash image.
 * @param {'Standard' | 'High'} quality Desired image quality ('Standard' or 'High'). Defaults to 'Standard'.
 */
export async function setUnsplashBackground(containerElement, apiKey, category = '', quality = 'Standard') {
  if (!containerElement) {
    console.error('Background container element not provided.');
    return;
  }

  // --- Try Unsplash API first if key is provided ---
  if (apiKey && apiKey !== 'YOUR_UNSPLASH_ACCESS_KEY') {
    // Construct the API URL
    let apiUrl = `https://api.unsplash.com/photos/random`;
    const params = new URLSearchParams();
    if (category) {
      params.append('query', category);
    }
    params.append('orientation', 'landscape'); // Prefer landscape

    const urlWithParams = `${apiUrl}?${params.toString()}`;
    console.log(`Fetching random photo info from Unsplash: ${urlWithParams}`);

    try {
      const response = await fetch(urlWithParams, {
        headers: {
          'Authorization': `Client-ID ${apiKey}`,
          'Accept-Version': 'v1'
        }
      });

      if (response.ok) {
        const data = await response.json();

        // Select URL based on quality setting
        const imageUrl = (quality === 'High' && data.urls.full) ? data.urls.full : data.urls.regular;

        if (data && data.urls && imageUrl) {
          console.log(`Got Unsplash image URL (${quality}):`, imageUrl);
          containerElement.style.backgroundImage = `url('${imageUrl}')`;
          containerElement.style.backgroundColor = data.color || '';
          return; // Success, exit the function
        } else {
          console.error('Invalid data received from Unsplash API:', data);
        }
      } else {
        console.error(`Error fetching Unsplash image: ${response.status} ${response.statusText}`);
        const errorData = await response.json().catch(() => null);
        console.error('Unsplash API Error Details:', errorData);
        // If API fails (rate limit, bad key etc.), fall through to local background
      }
    } catch (error) {
      console.error('Network error fetching Unsplash image:', error);
      // If network error, fall through to local background
    }
  }

  // --- Fallback to Local Background ---
  console.log('API key missing, invalid, or API failed. Falling back to local background.');
  setLocalBackground(containerElement);
}
