const PADDLE_SANDBOX_API_KEY = process.env.PADDLE_SANDBOX_API_KEY || "";
const PADDLE_LIVE_API_KEY = process.env.PADDLE_LIVE_API_KEY || "";
const PADDLE_ENVIRONMENT = process.env.PADDLE_ENVIRONMENT || "sandbox";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  priceId: string;
  amount: number;
  currency: string;
  interval: "monthly";
  tier: "basic" | "pro";
  duration: 1 | 3 | 6 | 12; // months
  features: string[];
  proFeatures?: string[];
}

export interface PaddleSubscriptionOptions {
  priceId: string;
  customerEmail?: string;
  customerName?: string;
  userId?: string;
  tier?: string;
  duration?: number;
  metadata?: Record<string, string>;
}

export interface PaddleCheckoutResponse {
  checkoutUrl: string;
  subscriptionId?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  // Basic Plans
  {
    id: "basic_1m",
    name: "Basic - 1 Month",
    description: "Offline only",
    priceId: "pri_01ky9gf1b3x9pxh1d0w58svqma",
    amount: 3.5,
    currency: "USD",
    interval: "monthly",
    tier: "basic",
    duration: 1,
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
  },
  {
    id: "basic_3m",
    name: "Basic - 3 Months",
    description: "Offline only (Save 10%)",
    priceId: "pri_01ky9gf1b3x9pxh1d0w58svqma", // Same price ID, handled as 3-month
    amount: 9.45,
    currency: "USD",
    interval: "monthly",
    tier: "basic",
    duration: 3,
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
  },
  {
    id: "basic_6m",
    name: "Basic - 6 Months",
    description: "Offline only (Save 15%)",
    priceId: "pri_01ky9gf1b3x9pxh1d0w58svqma", // Same price ID, handled as 6-month
    amount: 17.85,
    currency: "USD",
    interval: "monthly",
    tier: "basic",
    duration: 6,
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
  },
  {
    id: "basic_12m",
    name: "Basic - 12 Months",
    description: "Offline only (Save 20%)",
    priceId: "pri_01ky9gf1b3x9pxh1d0w58svqma", // Same price ID, handled as 12-month
    amount: 33.6,
    currency: "USD",
    interval: "monthly",
    tier: "basic",
    duration: 12,
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
  },
  // Pro Plans
  {
    id: "pro_1m",
    name: "Pro - 1 Month",
    description: "Full features with sync",
    priceId: "pri_01ky9gf1pfhfxefmqen09hq334",
    amount: 10.5,
    currency: "USD",
    interval: "monthly",
    tier: "pro",
    duration: 1,
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
    proFeatures: [
      "Cloud sync across devices",
      "Web analytics dashboard",
      "Employee management",
      "Advanced management tools",
      "Priority support",
    ],
  },
  {
    id: "pro_3m",
    name: "Pro - 3 Months",
    description: "Full features (Save 10%)",
    priceId: "pri_01ky9gf1pfhfxefmqen09hq334", // Same price ID, handled as 3-month
    amount: 28.35,
    currency: "USD",
    interval: "monthly",
    tier: "pro",
    duration: 3,
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
    proFeatures: [
      "Cloud sync across devices",
      "Web analytics dashboard",
      "Employee management",
      "Advanced management tools",
      "Priority support",
    ],
  },
  {
    id: "pro_6m",
    name: "Pro - 6 Months",
    description: "Full features (Save 15%)",
    priceId: "pri_01ky9gf1pfhfxefmqen09hq334", // Same price ID, handled as 6-month
    amount: 53.55,
    currency: "USD",
    interval: "monthly",
    tier: "pro",
    duration: 6,
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
    proFeatures: [
      "Cloud sync across devices",
      "Web analytics dashboard",
      "Employee management",
      "Advanced management tools",
      "Priority support",
    ],
  },
  {
    id: "pro_12m",
    name: "Pro - 12 Months",
    description: "Full features (Save 20%)",
    priceId: "pri_01ky9gf1pfhfxefmqen09hq334", // Same price ID, handled as 12-month
    amount: 100.8,
    currency: "USD",
    interval: "monthly",
    tier: "pro",
    duration: 12,
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
    proFeatures: [
      "Cloud sync across devices",
      "Web analytics dashboard",
      "Employee management",
      "Advanced management tools",
      "Priority support",
    ],
  },
];

export function getPaddleApiKey(): string {
  if (PADDLE_ENVIRONMENT === "live") {
    return PADDLE_LIVE_API_KEY;
  }
  return PADDLE_SANDBOX_API_KEY;
}

export function getPaddleApiUrl(): string {
  if (PADDLE_ENVIRONMENT === "live") {
    return "https://api.paddle.com";
  }
  return "https://sandbox-api.paddle.com";
}

export async function createSubscriptionCheckout(
  options: PaddleSubscriptionOptions
): Promise<PaddleCheckoutResponse> {
  const apiKey = getPaddleApiKey();
  const apiUrl = getPaddleApiUrl();

  if (!apiKey) {
    throw new Error("Paddle API key not configured");
  }

  if (!options.priceId) {
    throw new Error("Price ID is required for subscription checkout");
  }

  try {
    const response = await fetch(`${apiUrl}/pricing-preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            price_id: options.priceId,
            quantity: 1,
          },
        ],
        customer_email: options.customerEmail,
        customer_name: options.customerName,
        custom_data: {
          userId: options.userId,
          tier: options.tier,
          duration: options.duration,
          ...options.metadata,
        },
        return_url: `https://drippos.basthstudio.my.id/subscription-success?userId=${options.userId || ""}`,
        cancel_url: `https://drippos.basthstudio.my.id/subscription-cancelled`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Paddle API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();

    return {
      checkoutUrl: data.checkout_url || data.url,
      subscriptionId: data.subscription_id,
    };
  } catch (error) {
    console.error("Error creating Paddle subscription checkout:", error);
    throw error;
  }
}

export function formatSubscriptionAmount(
  amount: number,
  currency: string = "USD"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}

export function getPlansByTier(tier: "basic" | "pro"): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter((plan) => plan.tier === tier);
}

export function calculateMonthlyPrice(amount: number, duration: number): string {
  const monthly = amount / duration;
  return formatSubscriptionAmount(monthly) + "/month";
}
