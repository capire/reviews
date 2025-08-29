
using { sap.capire.reviews as my } from '../db/schema';
namespace sap.capire.reviews.api;

@hcql @rest
service ReviewsService @(path:'reviews/api') {

  /**
   * Summary of average ratings per subject.
   */
  @readonly entity AverageRatings as projection on my.Reviews {
    key subject,
    round(avg(rating),2) as rating  : my.Rating,
    count(*)             as reviews : Integer,
  } group by subject;

  /**
   * Informs about changes in a subject's rating.
   */
  event AverageRatings.Changed : AverageRatings;

  /**
   * Allows to rate a subject by a user.
   */
  action rate (
    reviewer : my.Reviews:reviewer not null,
    subject  : my.Reviews:subject  not null,
    rating   : my.Rating           not null,
    title    : my.Reviews:title    default null,
    text     : my.Reviews:text     default null,
  );
}
