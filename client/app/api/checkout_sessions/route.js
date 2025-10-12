import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { stripe, getAllValidPriceIds } from "@/lib/stripe";

export async function POST(req) {
  try {
    // Verifică dacă Stripe este inițializat corect
    if (!stripe) {
      console.error('Stripe initialization error: STRIPE_SECRET_KEY missing');
      throw new Error('Stripe nu este configurat corect');
    }

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error('Unauthorized checkout attempt');
      return new Response(JSON.stringify({ error: 'Neautorizat' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const priceId = body.priceId;

    console.log('Checkout attempt:', {
      priceId,
      userId: session.user.id,
      email: session.user.email,
    });

    // Verifică dacă ID-ul de preț este valid (aceptăm precios de todas las monedas)
    const validPriceIds = getAllValidPriceIds();
    if (!validPriceIds.includes(priceId)) {
      console.error('Invalid price ID:', { priceId, validPriceIds });
      return new Response(JSON.stringify({
        error: 'ID preț invalid',
        details: `Prețul ${priceId} nu este valid. Prețuri disponibile: ${validPriceIds.join(', ')}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Creating Stripe checkout session with:', {
      priceId,
      email: session.user.email,
      userId: session.user.id
    });

    // Detectează URL-ul de bază (pentru production pe Vercel și development local)
    const baseUrl = process.env.NEXTAUTH_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      customer_email: session.user.email,
      metadata: {
        userId: session.user.id,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
        }
      }
    });

    console.log('Checkout session created successfully:', checkoutSession.id);

    return new Response(JSON.stringify({ sessionId: checkoutSession.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Eroare Stripe:', {
      message: error.message,
      type: error.type,
      statusCode: error.statusCode,
      code: error.code,
      param: error.param,
      stack: error.stack
    });

    // Determine appropriate status code
    const statusCode = error.statusCode || (error.type === 'StripeInvalidRequestError' ? 400 : 500);

    return new Response(JSON.stringify({
      error: error.message || 'Eroare server',
      type: error.type,
      code: error.code,
      details: error.param ? `Parametru invalid: ${error.param}` : undefined
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}