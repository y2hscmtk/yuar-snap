/* global process */

import assert from 'node:assert/strict'
import test from 'node:test'
import handler from '../api/shorten-url.js'

const liveTestEnabled = process.env.RUN_SHORT_IO_LIVE_TEST === '1'

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

test('Short.io live link redirects directly to the original URL', {
  skip: !liveTestEnabled,
}, async () => {
  const longUrl = process.env.SHORT_IO_TEST_URL?.trim()
  assert.ok(process.env.SHORT_IO_API_KEY, 'SHORT_IO_API_KEY is required')
  assert.ok(process.env.SHORT_IO_DOMAIN, 'SHORT_IO_DOMAIN is required')
  assert.ok(longUrl, 'SHORT_IO_TEST_URL is required')

  const response = createResponse()
  await handler({ method: 'POST', body: { url: longUrl } }, response)

  assert.equal(response.result.statusCode, 200)
  assert.equal(response.result.body.provider, 'short.io')
  assert.match(response.result.body.shortUrl, /^https:\/\//)

  const redirectResponse = await fetch(response.result.body.shortUrl, {
    redirect: 'manual',
  })
  assert.ok(
    [301, 302, 303, 307, 308].includes(redirectResponse.status),
    `expected a direct HTTP redirect, received ${redirectResponse.status}`
  )
  assert.equal(redirectResponse.headers.get('location'), longUrl)
})
