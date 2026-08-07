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

test('uses is.gd as the only URL shortener', { concurrency: false }, async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async (url) => {
    assert.match(url, /^https:\/\/is\.gd\/create\.php\?format=json&url=/)
    assert.equal(new URL(url).searchParams.get('url'), 'https://sign.example.com/?data=a&b=c')
    return new Response(JSON.stringify({ shorturl: 'https://is.gd/contract-sign' }), { status: 200 })
  }

  const result = await runHandler({
    method: 'POST',
    body: { url: 'https://sign.example.com/?data=a&b=c' },
  })

  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body, {
    shortUrl: 'https://is.gd/contract-sign',
    provider: 'is.gd',
  })
})

test('reports an error when is.gd is unavailable', { concurrency: false }, async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ errormessage: 'temporarily unavailable' }), { status: 503 })

  const result = await runHandler({
    method: 'POST',
    body: { url: 'https://sign.example.com/?data=contract' },
  })

  assert.equal(result.statusCode, 502)
  assert.deepEqual(result.body, {
    error: 'URL shortening failed',
    details: 'is.gd: temporarily unavailable',
  })
})

test('rejects a short URL from an unexpected host', { concurrency: false }, async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ shorturl: 'https://untrusted.example/contract' }), { status: 200 })

  const result = await runHandler({
    method: 'POST',
    body: { url: 'https://sign.example.com/?data=contract' },
  })

  assert.equal(result.statusCode, 502)
  assert.equal(result.body.error, 'URL shortening failed')
  assert.match(result.body.details, /is\.gd:/)
})

test('rejects invalid requests without calling a URL shortener', { concurrency: false }, async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
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
