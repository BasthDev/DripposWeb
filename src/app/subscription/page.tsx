"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSubscriptionCheckout, SUBSCRIPTION_PLANS, formatSubscriptionAmount } from "@/lib/paddle";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const userId = searchParams.get("userId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!plan || !userId) {
      setError("Missing required parameters");
      setLoading(false);
      return;
    }

    const planDetails = SUBSCRIPTION_PLANS.find((p) => p.id === plan);
    if (!planDetails) {
      setError("Invalid plan");
      setLoading(false);
      return;
    }

    handleSubscribe(planDetails);
  }, [plan, userId]);

  const handleSubscribe = async (planDetails: typeof SUBSCRIPTION_PLANS[0]) => {
    setLoading(true);
    setError(null);

    try {
      const result = await createSubscriptionCheckout({
        priceId: planDetails.priceId,
        userId: userId || undefined,
        tier: planDetails.tier,
      });

      if (result.checkoutUrl) {
        setCheckoutUrl(result.checkoutUrl);
        // Redirect to Paddle checkout
        window.location.href = result.checkoutUrl;
      } else {
        setError("Failed to create checkout");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create checkout");
    } finally {
      setLoading(false);
    }
  };

  const planDetails = plan ? SUBSCRIPTION_PLANS.find((p) => p.id === plan) : null;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Go Back
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Creating Checkout
          </h1>
          <p className="text-gray-600 mb-4">
            Setting up your subscription for {planDetails?.name} plan...
          </p>
          <p className="text-sm text-gray-500">
            You will be redirected to Paddle payment page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Redirecting to Payment
        </h1>
        <p className="text-gray-600 mb-4">
          Completing subscription for {planDetails?.name} plan
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">Plan Details:</p>
          <p className="font-semibold text-gray-900">{planDetails?.name}</p>
          <p className="text-2xl font-bold text-blue-600">
            {planDetails && formatSubscriptionAmount(planDetails.amount, planDetails.currency)}
            <span className="text-sm font-normal text-gray-600">/month</span>
          </p>
        </div>
        <p className="text-sm text-gray-500">
          If you are not redirected automatically,{" "}
          <a
            href={checkoutUrl || "#"}
            className="text-blue-600 hover:underline"
          >
            click here
          </a>
        </p>
      </div>
    </div>
  );
}
