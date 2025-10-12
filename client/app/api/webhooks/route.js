import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import { logPurchaseCompleted } from '@/lib/analytics-logger';

export async function POST(req) {
  try {
    // Verifică dacă Stripe este inițializat corect
    if (!stripe) {
      throw new Error('Stripe nu este configurat corect');
    }

    const payload = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    // Verifică secretul webhook
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET lipsește din variabilele de mediu');
    }

    let event;
    
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionUpdated(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Eroare generală webhook:', error);
    return NextResponse.json({ error: error.message || 'Eroare server' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session) {
  try {
    const userId = session.metadata?.userId;
    if (!userId) {
      console.error('Lipsește userId în metadatele sesiunii');
      return;
    }

    // Update user subscription
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        subscription: 'active'
      }
    });

    // Get subscription details to log the purchase
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const priceId = subscription.items.data[0]?.price.id;
      const amount = session.amount_total / 100; // Convert from cents
      const currency = session.currency?.toUpperCase() || 'USD';

      // Determine plan type based on price
      let planType = 'premium_monthly';
      if (priceId.includes('annual') || amount >= 80) {
        planType = 'premium_annual';
      }

      // Log the purchase completion for analytics
      await logPurchaseCompleted(
        userId,
        planType,
        amount,
        session.id,
        currency
      );

      console.log(`Purchase logged: ${planType} - ${currency}${amount} for user ${userId}`);
    } catch (analyticsError) {
      // Don't fail the webhook if analytics logging fails
      console.error('Failed to log purchase analytics:', analyticsError);
    }
  } catch (error) {
    console.error('Eroare la actualizare după checkout:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscription: 'active',
          stripeSubscriptionId: subscriptionId,
        }
      });
    }
  } catch (error) {
    console.error('Eroare la actualizare după plată:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const customerId = subscription.customer;
    const status = subscription.status;
    
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscription: status === 'active' ? 'active' : 'inactive',
          stripeSubscriptionId: subscription.id,
        }
      });
    }
  } catch (error) {
    console.error('Eroare la actualizare abonament:', error);
    throw error;
  }
}