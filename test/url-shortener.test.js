import assert from 'node:assert/strict'
import test from 'node:test'
import { shortenUrl } from '../src/utils/urlShortener.js'

const setupBrowserEnvironment = (t) => {
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  const storage = new Map()

  globalThis.window = {
    clearTimeout,
    localStorage: {
      getItem(key) {
        return storage.get(key) ?? null
      },
      setItem(key, value) {
        storage.set(key, value)
      },
    },
    setTimeout,
  }

  t.after(() => {
    globalThis.fetch = originalFetch
    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }
  })
}

test('uses and caches a Short.io URL returned by the server API', { concurrency: false }, async (t) => {
  setupBrowserEnvironment(t)
  let requestCount = 0

  globalThis.fetch = async (url, options) => {
    requestCount += 1
    assert.equal(url, '/api/shorten-url')
    assert.equal(options.method, 'POST')
    assert.deepEqual(JSON.parse(options.body), {
      url: 'https://sign.example.com/?data=contract-a',
    })

    return new Response(JSON.stringify({
      provider: 'short.io',
      shortUrl: 'https://links.example.com/contract-a',
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  const first = await shortenUrl('https://sign.example.com/?data=contract-a')
  const cached = await shortenUrl('https://sign.example.com/?data=contract-a')

  assert.deepEqual(first, {
    url: 'https://links.example.com/contract-a',
    shortened: true,
    reason: 'server',
  })
  assert.deepEqual(cached, {
    url: 'https://links.example.com/contract-a',
    shortened: true,
    reason: 'cache',
  })
  assert.equal(requestCount, 1)
})

test('falls back to the original URL when the server API fails', { concurrency: false }, async (t) => {
  setupBrowserEnvironment(t)
  const originalConsoleWarn = console.warn
  console.warn = () => {}
  t.after(() => {
    console.warn = originalConsoleWarn
  })

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'URL shortening failed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 502,
    })

  const result = await shortenUrl('https://sign.example.com/?data=contract-b')

  assert.deepEqual(result, {
    url: 'https://sign.example.com/?data=contract-b',
    shortened: false,
    reason: 'server_error',
  })
})

test('rejects an unexpected provider returned by the server API', { concurrency: false }, async (t) => {
  setupBrowserEnvironment(t)
  const originalConsoleWarn = console.warn
  console.warn = () => {}
  t.after(() => {
    console.warn = originalConsoleWarn
  })

  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      provider: 'unknown',
      shortUrl: 'https://untrusted.example/contract',
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  const result = await shortenUrl('https://sign.example.com/?data=contract-c')

  assert.deepEqual(result, {
    url: 'https://sign.example.com/?data=contract-c',
    shortened: false,
    reason: 'server_error',
  })
})

test('does not request a short link for localhost', { concurrency: false }, async (t) => {
  setupBrowserEnvironment(t)
  const originalConsoleInfo = console.info
  console.info = () => {}
  t.after(() => {
    console.info = originalConsoleInfo
  })

  globalThis.fetch = () => {
    throw new Error('fetch must not be called')
  }

  const result = await shortenUrl('http://localhost:5173/?data=contract')

  assert.deepEqual(result, {
    url: 'http://localhost:5173/?data=contract',
    shortened: false,
    reason: 'local',
  })
})
