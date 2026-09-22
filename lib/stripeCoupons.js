/**
 * lib/stripeCoupons.js
 * Idempotently fetch-or-create fixed-id Stripe coupons used for signup perks,
 * so we don't spam the Stripe dashboard with a new coupon on every checkout.
 */

export async function getOrCreateCoupon(stripe, id, params) {
  try {
    return await stripe.coupons.retrieve(id);
  } catch (err) {
    if (err.code !== 'resource_missing') throw err;
    return stripe.coupons.create({ id, ...params });
  }
}
