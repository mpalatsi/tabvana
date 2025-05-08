chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchDdgSuggestions") {
    const query = request.query;
    fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&format=json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        console.error('[Tabvana BGS] Error fetching DDG suggestions:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates that the response will be sent asynchronously
  }
});
