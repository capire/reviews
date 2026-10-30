const cds = require('@sap/cds')

const { GET, PUT, expect, defaults } = cds.test(__dirname + '/..')
cds.requires.messaging = { kind: 'file-based-messaging', file: 'gen/messages.txt' }

defaults.auth = { username: 'alice' }
defaults.path = '/rest/reviews'

describe('ReviewsService', () => {

  it('PUT new review', async () => {
    const { status, data } = await PUT('Reviews', {
      subject: '201',
      title: 'Great book',
      rating: 4,
      text: 'Really enjoyed this one.',
    })
    expect(status).to.equal(200)
    expect(data).to.include({ subject: '201', reviewer: 'alice', rating: 4 })
  })

  it('PUT updates review', async () => {
    const response1 = await PUT('Reviews', {
      subject: '201',
      title: 'Great book',
      rating: 4,
      text: 'Really enjoyed this one.',
    })
    expect(response1.status).to.equal(200)
    expect(response1.data).to.include({ subject: '201', reviewer: 'alice', rating: 4 })
    const response2 = await PUT('Reviews', {
      subject: '201',
      title: 'Good book',
      rating: 2,
    })
    expect(response2.status).to.equal(200)
    expect(response2.data).to.include({ subject: '201', reviewer: 'alice', rating: 2, title: 'Good book' })
    const response3 = await GET("Reviews(subject='201',reviewer='alice')")
    expect(response3.status).to.equal(200)
    expect(response3.data).to.include({ subject: '201', reviewer: 'alice', rating: 2, title: 'Good book' })
  })
})
