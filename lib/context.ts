import { getCurrentEvents, formatNewsForContext } from './current-events'

/**
 * Weather cache entry
 */
interface WeatherCacheEntry {
  tempC: number
  condition: string
  humidity: number
  windKph: number
  fetchedAtISO: string
}

/**
 * Context data returned by getContext()
 */
export interface ContextData {
  nowISO: string
  localTime: string
  localDate: string
  city: string
  weather?: {
    tempC: number
    condition: string
    humidity: number
    windKph: number
    fetchedAtISO: string
  }
  currentEvents?: {
    summary: string
    fetchedAtISO: string
  }
}

// In-memory weather cache: city -> WeatherCacheEntry
const weatherCache = new Map<string, WeatherCacheEntry>()

// Cache TTL in seconds (default: 10 minutes)
const WEATHER_CACHE_TTL_SECONDS = parseInt(
  process.env.WEATHER_CACHE_TTL_SECONDS || '600',
  10
)

/**
 * Fetches weather from OpenWeatherMap API with timeout
 */
async function fetchWeather(city: string): Promise<WeatherCacheEntry | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    console.warn('[context] OPENWEATHER_API_KEY not set, skipping weather')
    return null
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    console.log(`[context] Fetching weather for ${city}...`)
    
    // Add timeout to prevent blocking
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    try {
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`[context] OpenWeather API error: ${response.status} ${response.statusText}`, errorText.substring(0, 200))
        return null
      }

      const data = await response.json()
      
      if (!data.main || !data.weather || !data.weather[0]) {
        console.warn('[context] Invalid weather data structure:', JSON.stringify(data).substring(0, 200))
        return null
      }
      
      const weatherData = {
        tempC: Math.round(data.main.temp),
        condition: data.weather[0]?.main || 'Unknown',
        humidity: data.main.humidity,
        windKph: Math.round((data.wind?.speed || 0) * 3.6), // m/s to km/h
        fetchedAtISO: new Date().toISOString(),
      }
      
      console.log(`[context] Weather fetched successfully: ${weatherData.tempC}°C, ${weatherData.condition}`)
      return weatherData
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        console.warn('[context] Weather fetch timeout (5s)')
        return null
      }
      throw fetchError
    }
  } catch (error) {
    console.warn('[context] Weather fetch error:', error)
    if (error instanceof Error) {
      console.warn('[context] Error details:', error.message)
    }
    return null
  }
}

/**
 * Gets cached weather or fetches new weather if cache expired
 */
async function getWeather(city: string): Promise<WeatherCacheEntry | null> {
  const cached = weatherCache.get(city)
  
  if (cached) {
    const fetchedAt = new Date(cached.fetchedAtISO)
    const ageSeconds = (Date.now() - fetchedAt.getTime()) / 1000
    
    if (ageSeconds < WEATHER_CACHE_TTL_SECONDS) {
      return cached
    }
  }

  // Cache expired or missing, fetch new weather
  const weather = await fetchWeather(city)
  
  if (weather) {
    weatherCache.set(city, weather)
  }
  
  return weather
}

/**
 * Gets context data including time, date, and weather
 */
export async function getContext(cityOverride?: string): Promise<ContextData> {
  try {
    const now = new Date()
    const city = cityOverride || process.env.DEFAULT_CITY || 'London'

    // Format time and date
    const localTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    const localDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    // Get weather (may be null if API fails or key missing)
    // Wrap in try-catch to ensure weather fetch never breaks the whole context
    // For now, fetch weather asynchronously to avoid blocking
    let weather = null
    try {
      // Use Promise.race with timeout to prevent hanging
      const weatherPromise = getWeather(city)
      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 3000)
      )
      
      weather = await Promise.race([weatherPromise, timeoutPromise])
      
      if (!weather) {
        console.log(`[context] No weather data available for ${city} (API key set: ${!!process.env.OPENWEATHER_API_KEY})`)
      }
    } catch (weatherError) {
      console.warn('[context] Weather fetch failed (non-fatal):', weatherError)
      // Continue without weather
    }

    // Get current events (non-blocking, optional)
    let currentEvents = null
    try {
      const eventsPromise = getCurrentEvents()
      const eventsTimeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 3000)
      )
      
      const eventsData = await Promise.race([eventsPromise, eventsTimeoutPromise])
      
      if (eventsData) {
        const summary = formatNewsForContext(eventsData, 3)
        if (summary) {
          currentEvents = {
            summary,
            fetchedAtISO: eventsData.fetchedAtISO,
          }
        }
      }
    } catch (eventsError) {
      console.warn('[context] Current events fetch failed (non-fatal):', eventsError)
      // Continue without current events
    }

    return {
      nowISO: now.toISOString(),
      localTime,
      localDate,
      city,
      weather: weather || undefined,
      currentEvents: currentEvents || undefined,
    }
  } catch (error) {
    console.error('[context] getContext error:', error)
    // Return minimal context on error
    const now = new Date()
    return {
      nowISO: now.toISOString(),
      localTime: now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      localDate: now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      city: cityOverride || process.env.DEFAULT_CITY || 'London',
      weather: undefined,
    }
  }
}

