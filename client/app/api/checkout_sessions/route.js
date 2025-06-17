import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { stripe, PRICE_IDS } from "@/lib/stripe";

export async function POST(req) {
  try {
    // Verifică dacă Stripe este inițializat corect
    if (!stripe) {
      throw new Error('Stripe nu este configurat corect');
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Neautorizat' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const priceId = body.priceId;
    
    // Verifică dacă ID-ul de preț este valid
    const validPriceIds = Object.values(PRICE_IDS).filter(id => id);
    if (!validPriceIds.includes(priceId)) {
      return new Response(JSON.stringify({ error: 'ID preț invalid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
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

    return new Response(JSON.stringify({ sessionId: checkoutSession.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Eroare Stripe:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Eroare server' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}