import { createApp, ref, reactive } from 'vue'
import cds from './cap.js'

const { GET, PUT, POST } = await cds.connect.to ('/rest/reviews/')
createApp ({ setup() {

  const $ = sel => document.querySelector(sel)
  const reviews = ref([])
  const review = ref({
    /** The reviewed subject, e.g. a book */  subject: '',
    /** The reviewer */                       reviewer: '',
    /** The review text */                    text: '',
    /** The review rating */                  rating: 0,
  })

  const message = reactive({
    succeeded: undefined,
    failed: undefined,
    reset() { this.succeeded = this.failed = undefined }
  })

  return {
    reviews, review, message, Ratings: {
      5: '★★★★★',
      4: '★★★★☆',
      3: '★★★☆☆',
      2: '★★☆☆☆',
      1: '★☆☆☆☆',
    },
    at: date => date && new Date(date).toDateString(),

    async fetch (pattern) {
      const { data } = await GET `ListOfReviews${pattern ? `?$search=${pattern}` : ''}`
      reviews.value = data
      review.value = undefined
      $('input#search').focus()
    },

    async edit (index) {
      if (index !== undefined) {
        review.value = reviews.value [index]
        const { subject, reviewer } = review.value
        const { data } = await GET `Reviews/${subject}/${reviewer}/text/$value`
        review.value.text = data.text
      } else {
        review.value = {}
        setTimeout (()=> $('form > input').focus(), 111)
      }
      message.reset()
    },

    like: ()=> {
      message.reset()
      const { subject, reviewer } = review.value
      POST (`like`, {review:{subject,reviewer}})
        .then (()=> { message.succeeded = 'Your like was submitted. Thanks.'})
        .catch (e => message.failed = e.response.data.error.message)
    },

    unlike: ()=> {
      message.reset()
      const { subject, reviewer } = review.value
      POST (`unlike`, {review:{subject,reviewer}})
        .then (()=> { message.succeeded = 'Your unlike was submitted. Thanks.'})
        .catch (e => message.failed = e.response.data.error.message)
    },

    submit: () => {
      message.reset()
      PUT (`Reviews`, review.value)
        .then ((result) => { review.value = result.data; message.succeeded = 'Your review was submitted. Thanks.' })
        .catch (e => message.failed = e.response?.data?.error?.message || e.message )
    }
  }

}}) .mount("#app") .fetch()
