/**
 * Current Events / News fetching system
 * Fetches top headlines and makes them available to the AI
 */

export interface NewsArticle {
  title: string
  description: string
  source: string
  publishedAt: string
  url?: string
}

export interface CurrentEventsData {
  articles: NewsArticle[]
  fetchedAtISO: string
  category?: string
}

/**
 * News cache entry
 */
interface NewsCacheEntry extends CurrentEventsData {
  fetchedAtISO: string
}

// In-memory news cache
const newsCache = new Map<string, NewsCacheEntry>()

// Cache TTL in seconds (default: 1 hour for news)
const NEWS_CACHE_TTL_SECONDS = parseInt(
  process.env.NEWS_CACHE_TTL_SECONDS || '3600',
  10
)

/**
 * Fetch news from NewsAPI.org (free tier)
 */
async function fetchNewsFromNewsAPI(): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) {
    console.warn('[current-events] NEWS_API_KEY not set')
    return []
  }

  try {
    // Fetch general headlines (can be customized by country/category)
    const country = process.env.NEWS_COUNTRY || 'ca' // Default to Canada
    const url = `https://newsapi.org/v2/top-headlines?country=${country}&pageSize=5&apiKey=${apiKey}`
    
    console.log('[current-events] Fetching news headlines...')
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    try {
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`[current-events] NewsAPI error: ${response.status}`, errorText.substring(0, 200))
        return []
      }

      const data = await response.json()
      
      if (!data.articles || !Array.isArray(data.articles)) {
        console.warn('[current-events] Invalid news data structure')
        return []
      }

      const articles: NewsArticle[] = data.articles
        .filter((article: any) => article.title && article.description)
        .slice(0, 5) // Top 5 headlines
        .map((article: any) => ({
          title: article.title || '',
          description: article.description || '',
          source: article.source?.name || 'Unknown',
          publishedAt: article.publishedAt || new Date().toISOString(),
          url: article.url,
        }))

      console.log(`[current-events] Fetched ${articles.length} headlines`)
      return articles
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        console.warn('[current-events] News fetch timeout (5s)')
        return []
      }
      throw fetchError
    }
  } catch (error) {
    console.warn('[current-events] News fetch error:', error)
    if (error instanceof Error) {
      console.warn('[current-events] Error details:', error.message)
    }
    return []
  }
}

/**
 * Fallback: Generate synthetic current events based on date/time
 * This provides basic temporal awareness even without API
 */
function getSyntheticEvents(): NewsArticle[] {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const hour = now.getHours()
  
  // Basic day/time awareness without external API
  const syntheticEvents: NewsArticle[] = []
  
  if (hour >= 6 && hour < 10) {
    syntheticEvents.push({
      title: 'Morning News Update',
      description: 'A new day begins. Good morning!',
      source: 'Local',
      publishedAt: now.toISOString(),
    })
  }
  
  if (dayOfWeek === 1) { // Monday
    syntheticEvents.push({
      title: 'Start of the Week',
      description: 'Beginning of a new week.',
      source: 'Local',
      publishedAt: now.toISOString(),
    })
  }
  
  if (dayOfWeek === 5) { // Friday
    syntheticEvents.push({
      title: 'Weekend Approaching',
      description: 'Friday vibes heading into the weekend.',
      source: 'Local',
      publishedAt: now.toISOString(),
    })
  }
  
  return syntheticEvents
}

/**
 * Gets cached news or fetches new news if cache expired
 */
async function getNews(category: string = 'general'): Promise<CurrentEventsData | null> {
  const cacheKey = category
  
  const cached = newsCache.get(cacheKey)
  
  if (cached) {
    const fetchedAt = new Date(cached.fetchedAtISO)
    const ageSeconds = (Date.now() - fetchedAt.getTime()) / 1000
    
    if (ageSeconds < NEWS_CACHE_TTL_SECONDS) {
      return cached
    }
  }

  // Cache expired or missing, fetch new news
  let articles: NewsArticle[] = []
  
  // Try NewsAPI first if key is set
  if (process.env.NEWS_API_KEY) {
    articles = await fetchNewsFromNewsAPI()
  }
  
  // Fallback to synthetic events if API fails or not configured
  if (articles.length === 0) {
    articles = getSyntheticEvents()
  }
  
  if (articles.length > 0) {
    const newsData: NewsCacheEntry = {
      articles,
      fetchedAtISO: new Date().toISOString(),
      category,
    }
    newsCache.set(cacheKey, newsData)
    return newsData
  }
  
  return null
}

/**
 * Gets current events data (cached or fresh)
 * Returns null if unavailable (non-blocking)
 */
export async function getCurrentEvents(): Promise<CurrentEventsData | null> {
  try {
    const news = await getNews('general')
    return news
  } catch (error) {
    console.warn('[current-events] getCurrentEvents error:', error)
    return null
  }
}

/**
 * Format news for AI context (compact summary)
 */
export function formatNewsForContext(news: CurrentEventsData | null, maxItems: number = 3): string | null {
  if (!news || !news.articles || news.articles.length === 0) {
    return null
  }

  const items = news.articles.slice(0, maxItems)
  const summaries = items.map(article => {
    // Keep it brief - just title, maybe truncate description
    const desc = article.description && article.description.length > 100
      ? article.description.substring(0, 100) + '...'
      : article.description
    return `${article.title}${desc ? ` - ${desc}` : ''}`
  })

  return summaries.join(' | ')
}

