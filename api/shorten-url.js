/* global process */

import { createLink, setApiKey } from '@short.io/client-node'

const SHORT_IO_REQUEST_TIMEOUT_MS = 4000

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeDomain = (value) => {
  const domain = normalizeString(value).toLowerCase().replace(/\.$/, '')
  if (!domain) {
    return ''
  }

  try {
    const parsed = new URL(`https://${domain}`)
    const isHostnameOnly = parsed.hostname === domain &&
      parsed.port === '' &&
      parsed.pathname === '/' &&
      parsed.search === '' &&
      parsed.hash === ''

    return isHostnameOnly ? domain : ''
  } catch {
    return ''
  }
}

const isValidShareUrl = (value) => {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) &&
      !['localhost', '127.0.0.1'].includes(parsed.hostname)
  } catch {
    return false
  }
}

const isExpectedShortUrl = (value, domain) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' &&
      parsed.hostname.toLowerCase() === domain &&
      parsed.username === '' &&
      parsed.password === ''
  } catch {
    return false
  }
}

const errorMessageFrom = (value) => {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (value && typeof value === 'object') {
    return normalizeString(value.message) ||
      normalizeString(value.error) ||
      normalizeString(value.details)
  }

  return ''
}

const shortenWithShortIo = async (longUrl, { apiKey, domain }) => {
  setApiKey(apiKey)

  const result = await createLink({
    body: {
      allowDuplicates: false,
      cloaking: false,
      domain,
      originalURL: longUrl,
      redirectType: 302,
    },
    signal: AbortSignal.timeout(SHORT_IO_REQUEST_TIMEOUT_MS),
  })

  if (result.error || !result.data) {
    const status = result.response?.status
    const message = errorMessageFrom(result.error) ||
      (status ? `HTTP ${status}` : 'request failed')
    throw new Error(message)
  }

  const shortUrl = normalizeString(result.data.secureShortURL) ||
    normalizeString(result.data.shortURL)

  if (!isExpectedShortUrl(shortUrl, domain)) {
    throw new Error('Short.io returned an invalid URL')
  }

  return { shortUrl, provider: 'short.io' }
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

  const apiKey = normalizeString(process.env.SHORT_IO_API_KEY)
  const domain = normalizeDomain(process.env.SHORT_IO_DOMAIN)
  if (!apiKey || !domain) {
    return res.status(503).json({
      error: 'URL shortening is not configured',
      details: 'SHORT_IO_API_KEY and SHORT_IO_DOMAIN are required',
    })
  }

  try {
    const result = await shortenWithShortIo(longUrl, { apiKey, domain })
    return res.status(200).json(result)
  } catch (error) {
    console.error('Short.io URL shortening failed', error)
    return res.status(502).json({
      error: 'URL shortening failed',
      details: `short.io: ${errorMessageFrom(error) || 'failed'}`,
    })
  }
}
