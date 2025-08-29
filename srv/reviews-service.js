const cds = require ('@sap/cds')
module.exports = cds.service.impl (async function(){

  // Get the CSN definition for Reviews from the db schema for sub-sequent queries
  // ( Note: we explicitly specify the namespace to support embedded reuse )
  const { Reviews, Likes } = this.entities

  this.before (['CREATE','UPDATE'], 'Reviews', req => {
    if (!req.data.rating) req.data.rating = Math.round(Math.random()*4)+1
  })

  // Increment counter for reviews considered helpful
  this.on ('like', (req) => {
    if (!req.user)  return req.reject(400, 'You must be identified to like a review')
    let {review} = req.data, {user} = req
    return cds.run ([
      INSERT.into (Likes) .entries ({review_subject: review.subject, review_user: review.user, user: user.id}),
      UPDATE (Reviews) .set({liked: {'+=': 1}}) .where(review)
    ]).catch(() => req.reject(400, 'You already liked that review'))
  })

  // Delete a former like by the same user
  this.on ('unlike', async (req) => {
    if (!req.user)  return req.reject(400, 'You must be identified to remove a former like of yours')
    let {review} = req.data, { subject, reviewer } = review, {user} = req
    // Assuming Reviews entity uses composite keys: subject and user_ID
    let affectedRows = await DELETE.from (Likes) .where ({ subject, reviewer, user: user.id })
    if (affectedRows === 1)  return UPDATE (Reviews) .set ({ liked: {'-=': 1} }) .where ({ subject, reviewer })
  })


  // Inform API event subscribers about new avg ratings for reviewed subjects
  const api = await cds.connect.to ('sap.capire.reviews.api.ReviewsService')
  this.after (['CREATE','UPDATE','DELETE'], 'Reviews', async function(_,req) {
    const { subject, rating, reviews } = await api.get ('AverageRatings', { subject: req.data.subject })
    return api.emit ('AverageRatings.Changed', { subject, rating, reviews })
  })

})
