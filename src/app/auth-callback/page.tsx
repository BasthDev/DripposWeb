'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');

    if (userId && secret) {
      setStatus('Authentication successful! Redirecting to Drip POS...');
      // Trigger deep link back to mobile app with tokens
      window.location.href = `drippos://?userId=${userId}&secret=${secret}`;
    } else {
      setStatus('Authentication failed or tokens missing.');
    }
  }, [searchParams]);

  return (
    <div className="login-page">
      <div className="login-glass-card slide-up">
        <div className="login-header">
          <div className="login-logo-circle">
            <img
              src="/DP-Logo.png"
              alt="Drip POS Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
          <h1 className="login-title">
            Drip<span style={{ color: "var(--primary)" }}>POS</span>
          </h1>
          <p className="login-subtitle">OAuth Authentication</p>
        </div>
        <div className="form-group">
          <div className="input-wrapper">
            <div className="form-input" style={{ textAlign: 'center', padding: '16px' }}>
              {status}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="login-page">
        <div className="login-glass-card slide-up">
          <p>Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}