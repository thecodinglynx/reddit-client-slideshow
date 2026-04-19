export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-300 p-6 sm:p-12 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Privacy Policy</h1>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          Reddit Slideshow (&ldquo;the App&rdquo;) respects your privacy. This
          policy explains what data we collect and how we use it.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">Data We Collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account info:</strong> If you sign in with Google, we store
            your name, email, and profile picture to identify your account.
          </li>
          <li>
            <strong>User preferences:</strong> Your slideshow settings and liked
            posts are stored so they persist across sessions.
          </li>
          <li>
            <strong>Payment info:</strong> Subscription payments are processed by
            Stripe. We do not store your credit card details.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-white pt-2">Third-Party Services</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Google AdSense:</strong> We display ads via Google AdSense,
            which may use cookies to serve personalized ads. See{" "}
            <a
              href="https://policies.google.com/privacy"
              className="text-orange-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google&rsquo;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Reddit:</strong> Media is fetched from Reddit&rsquo;s public
            API. We do not share your data with Reddit.
          </li>
          <li>
            <strong>Stripe:</strong> Payment processing. See{" "}
            <a
              href="https://stripe.com/privacy"
              className="text-orange-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stripe&rsquo;s Privacy Policy
            </a>
            .
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-white pt-2">Data Retention</h2>
        <p>
          Your data is retained as long as your account exists. You can delete
          your account and all associated data by contacting us.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">Contact</h2>
        <p>
          For privacy questions, please open an issue on our GitHub repository.
        </p>
      </div>

      <a
        href="/"
        className="inline-block mt-8 text-orange-400 hover:text-orange-300 text-sm"
      >
        &larr; Back to slideshow
      </a>
    </div>
  );
}
