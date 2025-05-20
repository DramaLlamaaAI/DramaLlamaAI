import { Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

if (!process.env.STRIPE_PRICE_ID) {
  throw new Error('Missing required Stripe price ID: STRIPE_PRICE_ID');
}

// Initialize Stripe with the secret key in live mode (no test flag)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Pricing configuration
const PRICE_IDS = {
  personal: process.env.STRIPE_PRICE_ID, // Using the same price ID for now
  pro: process.env.STRIPE_PRICE_ID,
};

export const paymentController = {
  createSubscription: async (req: Request, res: Response) => {
    try {
      // Get plan from request
      const { plan } = req.body;
      const planKey = plan?.toLowerCase() || 'personal';
      
      // Validate plan
      if (!['personal', 'pro'].includes(planKey)) {
        return res.status(400).json({ error: 'Invalid plan selected' });
      }
      
      // Get price ID for the selected plan
      const priceId = PRICE_IDS[planKey as keyof typeof PRICE_IDS];
      
      if (!priceId) {
        return res.status(400).json({ error: 'Invalid plan configuration' });
      }
      
      // Check if user is authenticated
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required to create a subscription' });
      }
      
      // Get user from storage
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Create a customer if one doesn't exist
      let customerId = user.stripeCustomerId || null;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.username,
          metadata: {
            userId: userId.toString(),
          },
        });
        
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateStripeCustomerId(userId, customerId);
      }
      
      // Check if user has an active discount
      let discountPercentage = 0;
      if (user.discountPercentage && user.discountPercentage > 0) {
        // Check if the discount is still valid
        if (user.discountExpiryDate && new Date(user.discountExpiryDate) > new Date()) {
          discountPercentage = user.discountPercentage;
        }
      }
      
      // Calculate base amount based on plan
      let baseAmount = planKey === 'personal' ? 499 : 999; // Amount in cents (£4.99 or £9.99)
      
      // Apply discount if applicable
      let finalAmount = baseAmount;
      if (discountPercentage > 0) {
        finalAmount = Math.round(baseAmount * (1 - discountPercentage / 100));
      }
      
      // Create a payment intent with discounted amount
      const paymentIntent = await stripe.paymentIntents.create({
        amount: finalAmount,
        currency: 'gbp',
        customer: customerId,
        metadata: {
          plan: planKey,
          userId: userId.toString(),
          originalAmount: baseAmount.toString(),
          discountPercentage: discountPercentage.toString(),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
      
      // Return client secret and discount info to the frontend
      res.json({
        clientSecret: paymentIntent.client_secret,
        customerId: customerId,
        originalAmount: baseAmount,
        finalAmount: finalAmount,
        discountPercentage: discountPercentage,
        hasDiscount: discountPercentage > 0
      });
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ 
        error: 'Failed to create subscription',
        message: error.message 
      });
    }
  },
  
  handleWebhook: async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('Stripe webhook secret not configured, skipping signature verification');
      return res.status(200).end();
    }
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing Stripe signature header' });
    }

    let event;
    
    try {
      // Use the rawBody for signature verification in live mode
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event based on its type
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent ${paymentIntent.id} succeeded`);
        // Update user's tier based on the payment metadata
        if (paymentIntent.metadata.userId && paymentIntent.metadata.plan) {
          const userId = parseInt(paymentIntent.metadata.userId);
          const plan = paymentIntent.metadata.plan;
          
          try {
            const tier = plan === 'personal' ? 'personal' : 'pro';
            await storage.updateUserTier(userId, tier);
            console.log(`Updated user ${userId} to tier ${tier}`);
          } catch (err) {
            console.error(`Failed to update user tier: ${err}`);
          }
        }
        break;
      
      // Add other event types as needed
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).end();
  }
};