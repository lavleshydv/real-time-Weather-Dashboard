document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('weather-form');
    const cityInput = document.getElementById('city-input');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const weatherDisplay = document.getElementById('weather-display');

    // UI Elements for Data
    const cityNameDisplay = document.getElementById('city-name');
    const temperatureDisplay = document.getElementById('temperature');
    const humidityDisplay = document.getElementById('humidity');
    const windSpeedDisplay = document.getElementById('wind-speed');

    // Base API URLs
    const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
    const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const city = cityInput.value.trim();

        if (!city) return;

        // Reset UI State
        hideError();
        hideWeather();
        showLoading();

        try {
            // 1. Fetch Geocoding Data (Resolve city name to coordinates)
            const geoResponse = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(city)}&count=1`);
            
            if (!geoResponse.ok) {
                throw new Error('Failed to connect to the geocoding service. Please try again.');
            }
            
            const geoData = await geoResponse.json();

            if (!geoData.results || geoData.results.length === 0) {
                throw new Error(`City "${city}" not found. Please check your spelling.`);
            }

            const { latitude, longitude, name, country } = geoData.results[0];

            // 2. Fetch Weather Data using Coordinates
            const weatherResponse = await fetch(`${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`);
            
            if (!weatherResponse.ok) {
                throw new Error('Failed to retrieve weather data from the server.');
            }

            const weatherData = await weatherResponse.json();

            // 3. Process and Render Complex Nested JSON Object
            const current = weatherData.current;
            const units = weatherData.current_units;

            renderWeather({
                name: `${name}, ${country || ''}`,
                temperature: `${current.temperature_2m} ${units.temperature_2m}`,
                humidity: `${current.relative_humidity_2m} ${units.relative_humidity_2m}`,
                windSpeed: `${current.wind_speed_10m} ${units.wind_speed_10m}`
            });

        } catch (error) {
            // Comprehensive error handling
            console.error('Weather Dashboard Error:', error);
            
            // Check if it's a network error (TypeError usually means fetch failed due to network issues)
            if (error instanceof TypeError) {
                showError('Network error. Please check your internet connection.');
            } else {
                showError(error.message);
            }
        } finally {
            hideLoading();
        }
    });

    // --- UI Helper Functions ---

    function showLoading() {
        loadingSpinner.classList.remove('hidden');
    }

    function hideLoading() {
        loadingSpinner.classList.add('hidden');
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function hideWeather() {
        weatherDisplay.classList.add('hidden');
    }

    function renderWeather(data) {
        cityNameDisplay.textContent = data.name.replace(/,\s*$/, ""); // Remove trailing comma if country is missing
        temperatureDisplay.textContent = data.temperature;
        humidityDisplay.textContent = data.humidity;
        windSpeedDisplay.textContent = data.windSpeed;
        
        weatherDisplay.classList.remove('hidden');
    }
});
