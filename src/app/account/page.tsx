"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

interface SubscriptionInfo {
  status: string;
  currentPeriodEnd: string | null;
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subLoaded, setSubLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/subscription")
        .then((r) => r.json())
        .then((data) => setSubscription(data.subscription))
        .catch(() => {})
        .finally(() => setSubLoaded(true));
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Sign in to manage your account</p>
          <a href="/login" className="text-orange-400 hover:text-orange-300">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  const isPremium =
    subscription?.status === "active" || subscription?.status === "trialing";

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-black text-zinc-300 p-6 sm:p-12">
      <div className="max-w-md mx-auto space-y-8">
        <a
          href="/"
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          &larr; Back to slideshow
        </a>

        <h1 className="text-2xl font-bold text-white">Account</h1>

        {/* Profile */}
        <div className="flex items-center gap-4">
          {session.user?.image && (
            <img
              src={session.user.image}
              alt=""
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <p className="text-white font-medium">{session.user?.name}</p>
            <p className="text-zinc-500 text-sm">{session.user?.email}</p>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          {!subLoaded ? (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm uppercase tracking-wider">
                  Plan
                </span>
                <span
                  className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                    isPremium
                      ? "bg-orange-600/20 text-orange-400"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {isPremium ? "Premium" : "Free"}
                </span>
              </div>

              {!isPremium && (
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-orange-600/20 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Upgrade to Premium — ad-free"}
                </button>
              )}
            </>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
