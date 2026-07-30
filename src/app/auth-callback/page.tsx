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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h2>{status}</h2>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}