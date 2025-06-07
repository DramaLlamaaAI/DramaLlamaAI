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
  personal: process.env.STRIPE_PERSONAL_PRICE_ID || process.env.STRIPE_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_1RQoau2LzZSVOpcLq1KiF6K2',
  deepdive: process.env.STRIPE_DEEPDIVE_PRICE_ID || 'price_1RQoc32LzZSVOpcLNC8dOyXj',
};

export const paymentController = {
  createSubscription: async (req: Request, res: Response) => {
    try {
      // Get plan from request
      const { plan } = req.body;
      const planKey = plan?.toLowerCase() || 'personal';
      
      // Validate plan (including 'instant' as alias for 'deepdive')
      const validPlans = ['personal', 'pro', 'deepdive', 'instant'];
      if (!validPlans.includes(planKey)) {
        return res.status(400).json({ error: 'Invalid plan selected' });
      }
      
      // Map 'instant' to 'deepdive' for pricing
      const pricingPlan = planKey === 'instant' ? 'deepdive' : planKey;
      
      // Get price ID for the selected plan
      const priceId = PRICE_IDS[pricingPlan as keyof typeof PRICE_IDS];
      
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
      
      // Create a customer if one doesn't exist or if the existing one is invalid
      let customerId = user.stripeCustomerId || null;
      
      if (customerId) {
        try {
          // Verify the customer still exists in Stripe
          await stripe.customers.retrieve(customerId);
        } catch (error: any) {
          if (error.code === 'resource_missing') {
            // Customer doesn't exist anymore, clear the stored ID
            customerId = null;
            // Customer ID will be set to null and we'll create a new one below
          } else {
            throw error;
          }
        }
      }
      
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
      let baseAmount;
      switch (pricingPlan) {
        case 'personal':
          baseAmount = 399; // £3.99
          break;
        case 'pro':
          baseAmount = 799; // £7.99
          break;
        case 'deepdive':
          baseAmount = 199; // £1.99
          break;
        default:
          baseAmount = 399; // Default to personal
      }
      
      // Apply discount if applicable
      let finalAmount = baseAmount;
      if (discountPercentage > 0) {
        finalAmount = Math.round(baseAmount * (1 - discountPercentage / 100));
      }
      
      // Check for existing subscription
      if (user.stripeSubscriptionId) {
        try {
          const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          
          if (existingSubscription.status === 'active') {
            // For active subscriptions, create a new setup intent for payment method updates
            const setupIntent = await stripe.setupIntents.create({
              customer: customerId,
              payment_method_types: ['card'],
              usage: 'off_session',
            });

            return res.json({
              subscriptionId: existingSubscription.id,
              clientSecret: setupIntent.client_secret,
              customerId: customerId,
              originalAmount: baseAmount,
              finalAmount: finalAmount,
              discountPercentage: discountPercentage,
              hasDiscount: discountPercentage > 0,
              isExisting: true
            });
          }
        } catch (error) {
          console.log('Existing subscription not found, creating new one');
        }
      }

      // Create a subscription with the appropriate price
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card']
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          plan: planKey,
          userId: userId.toString(),
          originalAmount: baseAmount.toString(),
          discountPercentage: discountPercentage.toString(),
        },
      });

      // Update user with subscription ID and tier
      await storage.updateStripeSubscriptionId(userId, subscription.id);
      await storage.updateUserTier(userId, planKey);

      const invoice = subscription.latest_invoice as any;
      let paymentIntent = invoice?.payment_intent;
      
      console.log('Subscription created:', subscription.id);
      console.log('Invoice:', invoice?.id);
      console.log('Payment intent:', paymentIntent?.id);
      console.log('Client secret:', paymentIntent?.client_secret);
      
      // If no payment intent exists, create one manually
      if (!paymentIntent) {
        console.log('No payment intent found, creating one manually...');
        paymentIntent = await stripe.paymentIntents.create({
          amount: finalAmount,
          currency: 'gbp',
          customer: customerId,
          payment_method_types: ['card'],
          metadata: {
            subscription_id: subscription.id,
            plan: planKey,
            userId: userId.toString(),
          },
        });
        console.log('Created payment intent:', paymentIntent.id);
      }
      
      // Ensure we have a client secret
      if (!paymentIntent?.client_secret) {
        throw new Error('Payment intent client secret not available. Please try again.');
      }
      
      // Return client secret and discount info to the frontend
      res.json({
        subscriptionId: subscription.id,
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
    
    // Retrieve webhook secret from environment, or use the provided one
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // If webhook secret is not configured, log a warning but still try to process the event
    if (!webhookSecret) {
      console.warn('Stripe webhook secret not configured, proceeding without signature verification');
      
      try {
        // Process the event directly from the request body
        // Note: This is less secure but allows payments to work while webhook is being set up
        const event = req.body;
        
        if (event && event.type === 'payment_intent.succeeded') {
          const paymentIntent = event.data.object;
          console.log(`PaymentIntent ${paymentIntent.id} succeeded (unverified)`);
          
          // Update user's tier based on the payment metadata
          if (paymentIntent.metadata && paymentIntent.metadata.userId && paymentIntent.metadata.plan) {
            const userId = parseInt(paymentIntent.metadata.userId);
            const plan = paymentIntent.metadata.plan;
            
            try {
              const tier = plan === 'personal' ? 'personal' : 'pro';
              await storage.updateUserTier(userId, tier);
              console.log(`Updated user ${userId} to tier ${tier} (unverified webhook)`);
            } catch (err) {
              console.error(`Failed to update user tier: ${err}`);
            }
          }
        }
        
        return res.status(200).end();
      } catch (err) {
        console.error('Error processing unverified webhook:', err);
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }
    }
    
    // For verified webhooks with signature, continue with normal flow
    if (!signature) {
      return res.status(400).json({ error: 'Missing Stripe signature header' });
    }

    let event;
    
    try {
      // Use the rawBody for signature verification in live mode
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      
      // Only attempt signature verification if webhook secret is available
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        // If webhook secret isn't available, just use the request body directly
        // This is less secure but allows testing without the webhook secret
        event = req.body;
        console.log('No webhook secret available, using request body directly (less secure)');
      } else {
        // Use signature verification with webhook secret
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log('Webhook signature verified successfully');
      }
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