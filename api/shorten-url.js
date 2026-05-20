const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const isValidShareUrl = (value) => {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) &&
      !['localhost', '127.0.0.1'].includes(parsed.hostname)
  } catch {
    return false
  }
}

const fetchTextWithTimeout = async (url, options = {}, timeoutMs = 2500) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    const body = await response.text()

    return { response, body }
  } finally {
    clearTimeout(timeoutId)
  }
}

const shortenWithIsGd = async (longUrl) => {
  const { response, body } = await fetchTextWithTimeout(
    `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`,
    {
      headers: {
        'User-Agent': 'yuar-snap-contract-link/1.0',
      },
    },
    1800
  )

  let payload = null

  try {
    payload = JSON.parse(body)
  } catch {
    payload = null
  }

  if (
    response.ok &&
    typeof payload?.shorturl === 'string' &&
    payload.shorturl.startsWith('http')
  ) {
    return { shortUrl: payload.shorturl, provider: 'is.gd' }
  }

  const errorMessage = normalizeString(payload?.errormessage) ||
    normalizeString(body) ||
    'is.gd failed'

  throw new Error(errorMessage)
}

const shortenWithDaGd = async (longUrl) => {
  const { response, body } = await fetchTextWithTimeout(
    `https://da.gd/s?url=${encodeURIComponent(longUrl)}`,
    {
      headers: {
        'User-Agent': 'yuar-snap-contract-link/1.0',
      },
    },
    2500
  )

  const shortUrl = normalizeString(body)

  if (response.ok && shortUrl.startsWith('https://da.gd/')) {
    return { shortUrl, provider: 'da.gd' }
  }

  throw new Error(shortUrl || 'da.gd failed')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const longUrl = normalizeString(req.body?.url)
  if (!isValidShareUrl(longUrl)) {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  const errors = []

  try {
    const result = await shortenWithIsGd(longUrl)
    return res.status(200).json(result)
  } catch (error) {
    errors.push(`is.gd: ${error?.message || 'failed'}`)
  }

  try {
    const result = await shortenWithDaGd(longUrl)
    return res.status(200).json(result)
  } catch (error) {
    errors.push(`da.gd: ${error?.message || 'failed'}`)
  }

  return res.status(502).json({
    error: 'URL shortening failed',
    details: errors.join('\n'),
  })
}
