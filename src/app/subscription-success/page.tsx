"use client";

import { ArrowRight, CheckCircle, Cloud, Globe, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Subscription Activated!
        </h1>

        <p className="text-gray-600 mb-8">
          Thank you for subscribing. Your plan has been successfully activated.
        </p>

        <div className="bg-green-50 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-green-900 mb-4">
            What's Included:
          </h2>
          <ul className="text-left space-y-3 text-green-800">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Full POS functionality</span>
            </li>
            <li className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-green-600" />
              <span>Cloud sync across devices</span>
            </li>
            <li className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-600" />
              <span>Web analytics dashboard</span>
            </li>
            <li className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <span>Employee management</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Priority support</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <a
            href="drippos://"
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            <span>Open Mobile App</span>
            <ArrowRight className="w-5 h-5" />
          </a>

          <p className="text-sm text-gray-500">
            Return to the mobile app to access your new plan features
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
