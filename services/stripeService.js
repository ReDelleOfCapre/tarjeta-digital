const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripeInstance = null;

if (stripeSecretKey) {
  try {
    stripeInstance = Stripe(stripeSecretKey);
  } catch (e) {
    console.log('⚠️ Stripe initialize warning:', e.message);
  }
}

async function createCheckoutSession({ productId, title, price, type, origin }) {
  const priceAmount = parseFloat(price) || 199;
  const itemTitle = title || productId || 'Producto VYNK NFC';
  const baseOrigin = origin || 'https://tarjeta-digital.onrender.com';

  if (stripeInstance) {
    try {
      const lineItem = {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: itemTitle,
            description: type === 'subscription' ? 'Suscripción Recurrente VYNK Enterprise' : 'Hardware NFC Físico VYNK con Tecnología Directa'
          },
          unit_amount: Math.round(priceAmount * 100)
        },
        quantity: 1
      };

      if (type === 'subscription') {
        lineItem.price_data.recurring = { interval: 'month' };
      }

      const sessionParams = {
        payment_method_types: ['card'],
        line_items: [lineItem],
        mode: type === 'subscription' ? 'subscription' : 'payment',
        success_url: `${baseOrigin}/dashboard.html?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${baseOrigin}/planes.html?canceled=true`
      };

      if (type === 'payment') {
        sessionParams.shipping_address_collection = {
          allowed_countries: ['MX']
        };
      }

      const session = await stripeInstance.checkout.sessions.create(sessionParams);
      return { url: session.url, id: session.id };
    } catch (err) {
      console.error('❌ Error creando sesión de Stripe:', err.message);
    }
  }

  // Graceful Sandbox Mock URL when real keys are not present
  const mockUrl = `${baseOrigin}/dashboard.html?checkout_mock=true&type=${encodeURIComponent(type || 'payment')}&item=${encodeURIComponent(itemTitle)}&price=${priceAmount}`;
  return { url: mockUrl, isMock: true };
}

module.exports = {
  createCheckoutSession
};
