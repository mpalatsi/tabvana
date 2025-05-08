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
  
  // Listener for Weather Forecast
  if (request.action === "getWeatherForecast") {
    const { latitude, longitude, tempUnit } = request;
    const unitParam = tempUnit === 'imperial' ? 'fahrenheit' : 'celsius';
    // Request current weather + daily forecast (adjust parameters as needed)
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&temperature_unit=${unitParam}`;
    
    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('[Tabvana BGS] Weather data fetched:', data);
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        console.error('[Tabvana BGS] Error fetching weather forecast:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Async response
  }
});
