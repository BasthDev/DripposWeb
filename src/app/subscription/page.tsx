"use client";

import { formatSubscriptionAmount, SUBSCRIPTION_PLANS } from "@/lib/paddle";
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

  const handleSubscribe = (planDetails: (typeof SUBSCRIPTION_PLANS)[0]) => {
    setLoading(true);
    setError(null);

    const whatsappNumber = "62887777656364";
    const message = encodeURIComponent(
      `Hello, I would like to subscribe to the ${planDetails.name} plan (${formatSubscriptionAmount(planDetails.amount, planDetails.currency)}/month). Please assist me with the subscription process.`,
    );
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

    setCheckoutUrl(whatsappUrl);
    // Redirect to WhatsApp
    window.location.href = whatsappUrl;

    setLoading(false);
  };

  const planDetails = plan
    ? SUBSCRIPTION_PLANS.find((p) => p.id === plan)
    : null;

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
            Redirecting to WhatsApp
          </h1>
          <p className="text-gray-600 mb-4">
            Opening WhatsApp for {planDetails?.name} plan subscription...
          </p>
          <p className="text-sm text-gray-500">Contact: 087777656364</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Cloud,
      title: "Cloud Sync",
      description: "Sync your data across devices securely",
    },
    {
      icon: Globe,
      title: "Web Management",
      description:
        "Manage your business from anywhere with reports & analytics",
    },
    {
      icon: Users,
      title: "Employees Management",
      description: "Manage staff roles and permissions",
    },
  ];

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
            <span className="text-sm font-normal text-gray-600">/month</span>
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Subscription Features:
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
