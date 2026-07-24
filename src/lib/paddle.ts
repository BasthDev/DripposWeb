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
  features: string[];
}

export interface PaddleSubscriptionOptions {
  priceId: string;
  customerEmail?: string;
  customerName?: string;
  userId?: string;
  tier?: string;
  metadata?: Record<string, string>;
}

export interface PaddleCheckoutResponse {
  checkoutUrl: string;
  subscriptionId?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    description: "Offline only",
    priceId: "pri_01ky9gf1b3x9pxh1d0w58svqma",
    amount: 3.5,
    currency: "USD",
    interval: "monthly",
    tier: "basic",
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Offline + Cloud sync + Web analytics",
    priceId: "pri_01ky9gf1pfhfxefmqen09hq334",
    amount: 10.5,
    currency: "USD",
    interval: "monthly",
    tier: "pro",
    features: [
      "Full POS functionality",
      "Offline mode",
      "Cloud sync across devices",
      "Web analytics dashboard",
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
