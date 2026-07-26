"use client";

import { createSubscriptionCheckout, formatSubscriptionAmount, getPlanById } from "@/lib/paddle";
import {
  AlertCircle,
  CheckCircle,
  Cloud,
  Globe,
  Loader2,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const userId = searchParams.get("userId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!plan || !userId) {
      setError("Missing required parameters");
      setLoading(false);
      return;
    }

    const planDetails = getPlanById(plan);
    if (!planDetails) {
      setError("Invalid plan");
      setLoading(false);
      return;
    }

    // Get user data from Appwrite
    fetchUserData(userId);
  }, [plan, userId]);

  const fetchUserData = async (userId: string) => {
    try {
      // Skip account.get() for now - use the userId directly
      // After getting user data, create checkout
      if (!plan) {
        setError("Missing plan parameter");
        setLoading(false);
        return;
      }
      const planDetails = getPlanById(plan);
      if (planDetails && userId) {
        await handleSubscribe(planDetails, userId);
      }
    } catch (error) {
      console.error("Failed to process subscription:", error);
      setError("Failed to process subscription");
      setLoading(false);
    }
  };

  const handleSubscribe = async (planDetails: any, userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const checkout = await createSubscriptionCheckout({
        priceId: planDetails.priceId,
        userId: userId,
        tier: planDetails.tier,
        duration: planDetails.duration,
      });

      if (checkout.checkoutUrl) {
        setCheckoutUrl(checkout.checkoutUrl);
        // Redirect to Paddle checkout
        window.location.href = checkout.checkoutUrl;
      } else {
        setError("Failed to create checkout");
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      setError(error.message || "Failed to create checkout");
    } finally {
      setLoading(false);
    }
  };

  const planDetails = plan ? getPlanById(plan) : null;

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
            Setting up payment for {planDetails?.name} plan...
          </p>
        </div>
      </div>
    );
  }

  const isPro = planDetails?.tier === "pro";
  const features = isPro ? [
    {
      icon: Cloud,
      title: "Cloud Sync",
      description: "Sync your data across devices securely",
    },
    {
      icon: Globe,
      title: "Web Management",
      description: "Manage your business from anywhere with reports & analytics",
    },
    {
      icon: Users,
      title: "Employees Management",
      description: "Manage staff roles and permissions",
    },
  ] : [];

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
            {planDetails &&
              formatSubscriptionAmount(
                planDetails.amount,
                planDetails.currency,
              )}
            <span className="text-sm font-normal text-gray-600">/{planDetails?.duration || 1} months</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {planDetails && formatSubscriptionAmount(
              (planDetails.amount || 0) / (planDetails.duration || 1), 
              planDetails.currency || "USD"
            )}/month
          </p>
        </div>

        {isPro && features.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Pro Features:
            </p>
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 mb-3 last:mb-0">
                <feature.icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {feature.title}
                  </p>
                  <p className="text-xs text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
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

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  );
}
