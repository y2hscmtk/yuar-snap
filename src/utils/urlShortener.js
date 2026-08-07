const SHORTENER_TIMEOUT_MS = 2500
const SERVER_SHORTENER_TIMEOUT_MS = 4800
// 이전 공급자의 단축 URL이 브라우저 캐시에서 재사용되지 않게 버전을 분리한다.
const CACHE_PREFIX = 'yuar-short-url:v3:'

const hashString = (value) => {
    let hash = 5381
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) + hash) + value.charCodeAt(index)
        hash |= 0
    }
    return Math.abs(hash).toString(36)
}

const cacheKeyFor = (longUrl) => `${CACHE_PREFIX}${hashString(longUrl)}`

const getCachedShortUrl = (longUrl) => {
    try {
        const cached = window.localStorage.getItem(cacheKeyFor(longUrl))
        if (!cached) {
            return ''
        }

        const parsed = JSON.parse(cached)
        if (parsed?.longUrl === longUrl && typeof parsed?.shortUrl === 'string' && parsed.shortUrl.startsWith('https://is.gd/')) {
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
            JSON.stringify({ longUrl, shortUrl, createdAt: Date.now() })
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

        if (typeof payload?.shortUrl === 'string' && payload.shortUrl.startsWith('https://is.gd/')) {
            return payload.shortUrl
        }

        throw new Error('Shortener API returned an invalid URL')
    } finally {
        window.clearTimeout(timeoutId)
    }
}

const requestJsonpShortUrl = (longUrl) =>
    new Promise((resolve) => {
        let settled = false;
        let timeoutId;
        const callbackName = `isgd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const script = document.createElement('script');

        const cleanup = () => {
            delete window[callbackName];
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };

        const resolveOnce = (value) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(value);
        };

        try {
            // Define global callback
            window[callbackName] = (response) => {
                if (response && typeof response.shorturl === 'string' && response.shorturl.startsWith('https://is.gd/')) {
                    setCachedShortUrl(longUrl, response.shorturl)
                    resolveOnce(createResult({ url: response.shorturl, shortened: true }))
                } else {
                    console.warn('Shortening failed', response)
                    resolveOnce(createResult({
                        url: longUrl,
                        reason: response?.errormessage || 'shortener_error'
                    }))
                }
            };

            // Error handling for script load
            script.onerror = () => {
                console.warn('Script load error for is.gd')
                resolveOnce(createResult({ url: longUrl, reason: 'script_error' }))
            };

            timeoutId = window.setTimeout(() => {
                console.warn('is.gd timeout, fallback to original URL')
                resolveOnce(createResult({ url: longUrl, reason: 'timeout' }))
            }, SHORTENER_TIMEOUT_MS);

            script.async = true;
            // is.gd supports JSONP with callback
            script.src = `https://is.gd/create.php?format=json&callback=${callbackName}&url=${encodeURIComponent(longUrl)}`;
            document.body.appendChild(script);

        } catch (e) {
            console.warn('Shortening setup failed', e);
            resolveOnce(createResult({ url: longUrl, reason: 'setup_error' }));
        }
    });

export const shortenUrl = async (longUrl) => {
    // is.gd and other shorteners reject localhost. Return original for dev.
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
        console.warn('Server URL shortening failed, trying JSONP fallback', error)
    }

    return requestJsonpShortUrl(longUrl)
}
