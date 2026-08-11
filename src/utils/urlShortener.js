const SERVER_SHORTENER_TIMEOUT_MS = 4800
// 이전 공급자의 단축 URL이 브라우저 캐시에서 재사용되지 않게 버전을 분리한다.
const CACHE_PREFIX = 'yuar-short-url:v4:'

const hashString = (value) => {
    let hash = 5381
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) + hash) + value.charCodeAt(index)
        hash |= 0
    }
    return Math.abs(hash).toString(36)
}

const cacheKeyFor = (longUrl) => `${CACHE_PREFIX}${hashString(longUrl)}`

const isValidHttpsUrl = (value) => {
    try {
        const parsed = new URL(value)
        return parsed.protocol === 'https:' &&
            parsed.username === '' &&
            parsed.password === ''
    } catch {
        return false
    }
}

const getCachedShortUrl = (longUrl) => {
    try {
        const cached = window.localStorage.getItem(cacheKeyFor(longUrl))
        if (!cached) {
            return ''
        }

        const parsed = JSON.parse(cached)
        if (
            parsed?.longUrl === longUrl &&
            parsed?.provider === 'short.io' &&
            isValidHttpsUrl(parsed?.shortUrl)
        ) {
            return parsed.shortUrl
        }
    } catch (error) {
        console.warn('Short URL cache read failed', error)
    }

    return ''
}

const setCachedShortUrl = (longUrl, shortUrl) => {
    try {
        window.localStorage.setItem(
            cacheKeyFor(longUrl),
            JSON.stringify({
                longUrl,
                provider: 'short.io',
                shortUrl,
                createdAt: Date.now()
            })
        )
    } catch (error) {
        console.warn('Short URL cache write failed', error)
    }
}

const createResult = ({ url, shortened = false, reason = '' }) => ({
    url,
    shortened,
    reason
})

const requestServerShortUrl = async (longUrl) => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), SERVER_SHORTENER_TIMEOUT_MS)

    try {
        const response = await fetch('/api/shorten-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: longUrl }),
            signal: controller.signal
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok) {
            throw new Error(payload?.error || `Shortener API failed (${response.status})`)
        }

        if (
            payload?.provider === 'short.io' &&
            isValidHttpsUrl(payload?.shortUrl)
        ) {
            return payload.shortUrl
        }

        throw new Error('Shortener API returned an invalid URL')
    } finally {
        window.clearTimeout(timeoutId)
    }
}

export const shortenUrl = async (longUrl) => {
    if (longUrl.includes('localhost') || longUrl.includes('127.0.0.1')) {
        console.info('Skipping URL shortening for localhost')
        return createResult({ url: longUrl, reason: 'local' })
    }

    const cachedShortUrl = getCachedShortUrl(longUrl)
    if (cachedShortUrl) {
        return createResult({ url: cachedShortUrl, shortened: true, reason: 'cache' })
    }

    try {
        const serverShortUrl = await requestServerShortUrl(longUrl)
        setCachedShortUrl(longUrl, serverShortUrl)
        return createResult({ url: serverShortUrl, shortened: true, reason: 'server' })
    } catch (error) {
        console.warn('Server URL shortening failed, using the original URL', error)
        return createResult({
            url: longUrl,
            reason: error?.name === 'AbortError' ? 'timeout' : 'server_error'
        })
    }
}
