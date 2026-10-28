const { describe, it, before, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const cds = require('@sap/cds')

const { GET, POST, defaults } = cds.test(__dirname + '/..')
cds.requires.messaging = { kind: 'file-based-messaging', file: 'gen/messages.txt' }

defaults.path = '/rest/reviews'

// A seeded review used across the like/unlike tests (see db/data)
const review = { subject: '201', reviewer: 'bob' }

// Read the current `liked` counter of a review straight from the db
async function likedCount({ subject, reviewer }) {
  const { Reviews } = cds.entities('sap.capire.reviews')
  const row = await SELECT.one.from(Reviews).columns('liked').where({ subject, reviewer })
  return row.liked
}

// The Likes rows a given user has on a review
async function likesByUser({ subject, reviewer }, user) {
  const { Likes } = cds.entities('sap.capire.reviews')
  return SELECT.from(Likes).where({ review_subject: subject, review_reviewer: reviewer, user })
}

describe('ReviewsService - like / unlike', () => {

  // Keep each test isolated: clear any likes and reset the counter beforehand.
  beforeEach(async () => {
    defaults.auth = { username: 'alice' }
    const { Reviews, Likes } = cds.entities('sap.capire.reviews')
    await DELETE.from(Likes).where({ review_subject: review.subject, review_reviewer: review.reviewer })
    await UPDATE(Reviews).set({ liked: 0 }).where({ subject: review.subject, reviewer: review.reviewer })
  })

  it('likes a review -> creates a Like and increments the counter', async () => {
    const before = await likedCount(review)

    const { status } = await POST('like', { review })
    assert.equal(status, 204) // unbound action, no content returned

    assert.equal((await likesByUser(review, 'alice')).length, 1)
    assert.equal(await likedCount(review), before + 1)
  })

  it('rejects liking the same review twice by the same user', async () => {
    await POST('like', { review })
    await assert.rejects(POST('like', { review }), /already liked/i)

    // still exactly one like, counter not double-incremented
    assert.equal((await likesByUser(review, 'alice')).length, 1)
    assert.equal(await likedCount(review), 1)
  })

  it('lets different users like the same review independently', async () => {
    await POST('like', { review }) // as alice
    defaults.auth = { username: 'carol' }
    const { status } = await POST('like', { review })
    assert.equal(status, 204)

    assert.equal((await likesByUser(review, 'alice')).length, 1)
    assert.equal((await likesByUser(review, 'carol')).length, 1)
    assert.equal(await likedCount(review), 2)
  })

  it('unlikes a previously liked review -> removes the Like and decrements the counter', async () => {
    await POST('like', { review })
    const liked = await likedCount(review)

    const { status } = await POST('unlike', { review })
    assert.equal(status, 204)

    assert.equal((await likesByUser(review, 'alice')).length, 0)
    assert.equal(await likedCount(review), liked - 1)
  })

  it('rejects unliking a review that was never liked', async () => {
    const before = await likedCount(review)

    await assert.rejects(POST('unlike', { review }), /not liked/i)

    // nothing created, counter unchanged
    assert.equal((await likesByUser(review, 'alice')).length, 0)
    assert.equal(await likedCount(review), before)
  })

  it('rejects like for anonymous (non-identified) users', async () => {
    defaults.auth = undefined
    await assert.rejects(POST('like', { review }), /401/)
  })

  it('rejects unlike for anonymous (non-identified) users', async () => {
    defaults.auth = undefined
    await assert.rejects(POST('unlike', { review }), /401/)
  })
})
