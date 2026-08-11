/* global process */

import assert from 'node:assert/strict'
import test from 'node:test'
import handler from '../api/shorten-url.js'

const createResponse = () => {
  const result = { statusCode: 200, headers: {}, body: null }

  return {
    result,
    setHeader(name, value) {
      result.headers[name] = value
    },
    status(code) {
      result.statusCode = code
      return this
    },
    json(body) {
      result.body = body
      return this
    },
  }
}

const runHandler = async (request) => {
  const response = createResponse()
  await handler(request, response)
  return response.result
}

const configureShortIo = () => {
  process.env.SHORT_IO_API_KEY = 'test-secret-key'
  process.env.SHORT_IO_DOMAIN = 'links.example.com'
}

const clearShortIoConfig = () => {
  delete process.env.SHORT_IO_API_KEY
  delete process.env.SHORT_IO_DOMAIN
}

const silenceExpectedServerError = (t) => {
  const originalConsoleError = console.error
  console.error = () => {}
  t.after(() => {
    console.error = originalConsoleError
  })
}

test('creates a direct Short.io link through the official SDK', { concurrency: false }, async (t) => {
  const originalFetch = globalThis.fetch
  configureShortIo()
  t.after(() => {
    globalThis.fetch = originalFetch
    clearShortIoConfig()
  })

  globalThis.fetch = async (input, options) => {
    const request = input instanceof Request ? input : new Request(input, options)
    assert.equal(request.url, 'https://api.short.io/links')
    assert.equal(request.method, 'POST')
    assert.equal(request.headers.get('authorization'), 'test-secret-key')

    const body = await request.json()
    assert.deepEqual(body, {
      allowDuplicates: false,
      cloaking: false,
      domain: 'links.example.com',
      originalURL: 'https://sign.example.com/?data=a&b=c',
      redirectType: 302,
    })

    return new Response(JSON.stringify({
      shortURL: 'http://links.example.com/contract-sign',
      secureShortURL: 'https://links.example.com/contract-sign',
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  const result = await runHandler({
    method: 'POST',
    body: { url: 'https://sign.example.com/?data=a&b=c' },
  })

  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body, {
    shortUrl: 'https://links.example.com/contract-sign',
    provider: 'short.io',
  })
})

test('reports an error when Short.io is unavailable', { concurrency: false }, async (t) => {
  const originalFetch = globalThis.fetch
  configureShortIo()
  silenceExpectedServerError(t)
  t.after(() => {
    globalThis.fetch = originalFetch
    clearShortIoConfig()
  })

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: 'temporarily unavailable' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    })

  const result = await runHandler({
    method: 'POST',
    body: { url: 'https://sign.example.com/?data=contract' },
  })

  assert.equal(result.statusCode, 502)
  assert.deepEqual(result.body, {
    error: 'URL shortening failed',
    details: 'short.io: temporarily unavailable',
  })
})

test('rejects a short URL from an unexpected host', { concurrency: false }, async (t) => {
  const originalFetch = globalThis.fetch
  configureShortIo()
  silenceExpectedServerError(t)
  t.after(() => {
    globalThis.fetch = originalFetch
    clearShortIoConfig()
  })

  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      secureShortURL: 'https://untrusted.example/contract',
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  const result = await runHandler({
    method: 'POST',
    body: { url: 'https://sign.example.com/?data=contract' },
  })

  assert.equal(result.statusCode, 502)
  assert.equal(result.body.error, 'URL shortening failed')
  assert.match(result.body.details, /Short\.io returned an invalid URL/)
})

test('requires Short.io server configuration', { concurrency: false }, async (t) => {
  const originalFetch = globalThis.fetch
  clearShortIoConfig()
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = () => {
    throw new Error('fetch must not be called')
  }

  const result = await runHandler({
    method: 'POST',
    body: { url: 'https://sign.example.com/?data=contract' },
  })

  assert.equal(result.statusCode, 503)
  assert.deepEqual(result.body, {
    error: 'URL shortening is not configured',
    details: 'SHORT_IO_API_KEY and SHORT_IO_DOMAIN are required',
  })
})

test('rejects invalid requests without calling Short.io', { concurrency: false }, async (t) => {
  const originalFetch = globalThis.fetch
  configureShortIo()
  t.after(() => {
    globalThis.fetch = originalFetch
    clearShortIoConfig()
  })

  globalThis.fetch = () => {
    throw new Error('fetch must not be called')
  }

  const result = await runHandler({
    method: 'POST',
    body: { url: 'http://localhost:5173/?data=contract' },
  })

  assert.equal(result.statusCode, 400)
  assert.deepEqual(result.body, { error: 'Invalid URL' })
})

test('allows only POST requests', { concurrency: false }, async () => {
  const result = await runHandler({ method: 'GET', body: {} })

  assert.equal(result.statusCode, 405)
  assert.equal(result.headers.Allow, 'POST')
  assert.deepEqual(result.body, { error: 'Method Not Allowed' })
})
