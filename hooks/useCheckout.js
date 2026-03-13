import { useState } from 'react';

export function useCheckout() {
  // loading is either false or the agentId currently being checked out
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCheckout(agentId) {
    setLoading(agentId);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  // startCheckout is an alias for backwards compatibility
  return { handleCheckout, startCheckout: handleCheckout, loading, error };
}
