"use client";

import { Home, RefreshCw, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SubscriptionCancelledContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const handleTryAgain = () => {
    const plan = searchParams.get("plan");
    if (plan && userId) {
      window.location.href = `/subscription?plan=${plan}&userId=${userId}`;
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Subscription Cancelled
        </h1>

        <p className="text-gray-600 mb-8">
          The subscription process was cancelled. You can try again later or
          continue with limited features.
        </p>

        <div className="bg-red-50 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-red-900 mb-4">Note:</h2>
          <p className="text-red-800 text-sm">
            Without an active subscription, cloud sync and premium features will
            be limited.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleTryAgain}
            className="flex items-center justify-center gap-2 w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Try Again</span>
          </button>

          <a
            href="/"
            className="flex items-center justify-center gap-2 w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>Go to Home</span>
          </a>

          <a
            href="drippos://"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Return to Mobile App
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionCancelledPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <SubscriptionCancelledContent />
    </Suspense>
  );
}
