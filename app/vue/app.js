import { createApp } from 'vue'
import cds from './cap.js'

const { GET, PUT } = await cds.connect.to ('/rest/reviews/')
const $ = sel => document.querySelector(sel)
const reviews = createApp ({

  data() {
    return {
      list: [],
      review: undefined,
      message: {},
      Ratings: Object.entries({
        5 : '★★★★★',
        4 : '★★★★',
        3 : '★★★',
        2 : '★★',
        1 : '★',
      }).reverse()
    }
  },

  methods: {

    search: ({target:{value:v}}) => reviews.fetch(v && '&$search='+v),

    async fetch (filters='') {
      const {data} = await GET `ListOfReviews?${filters}`
      reviews.list = _decorated (data)
      $('input#search').focus()
    },

    async inspect (eve) {
      const review = reviews.review = reviews.list [eve.currentTarget.rowIndex-1]
      const {data} = await GET `Reviews/${review.subject}/${review.reviewer}/text/$value`
      review.text = data.text
      reviews.message = {}
    },

    newReview () {
      reviews.review = {}
      reviews.message = {}
      setTimeout (()=> $('form > input').focus(), 111)
    },

    async submitReview () {
      const review = reviews.review
      try {
        await PUT (`Reviews`, review)
        reviews.message = { succeeded: 'Your review was submitted successfully. Thanks.' }
      } catch (e) {
        reviews.message = { failed: e.response.data.error.message }
      }
    }

  },

}).mount("#app")


const _decorated = reviews => ({ __proto__: reviews, [Symbol.iterator]: function* () {
  for (let each of reviews) yield { __proto__: each,
    get stars() { return ('★'.repeat(Math.round(this.rating))+'☆☆☆☆☆').slice(0,5) },
    get datetime() { return this.date && new Date(this.date).toDateString() },
  }
}})


// initially fill list of my reviews
reviews.fetch()
