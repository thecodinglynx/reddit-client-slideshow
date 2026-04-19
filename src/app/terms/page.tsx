export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-300 p-6 sm:p-12 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Terms of Service</h1>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          By using Reddit Slideshow (&ldquo;the App&rdquo;), you agree to these
          terms.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">Use of the App</h2>
        <p>
          The App displays publicly available media from Reddit. We are not
          affiliated with Reddit Inc. Content displayed is subject to
          Reddit&rsquo;s own terms and the rights of its original creators.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">Accounts</h2>
        <p>
          You may use the App without an account. Creating an account enables
          cross-device syncing and premium features. You are responsible for your
          account security.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">Premium Subscription</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Premium removes ads for a monthly fee.</li>
          <li>Subscriptions are billed monthly via Stripe and renew automatically.</li>
          <li>You can cancel anytime through your account settings.</li>
          <li>No refunds for partial billing periods.</li>
        </ul>

        <h2 className="text-lg font-semibold text-white pt-2">Content</h2>
        <p>
          We do not claim ownership of any Reddit content displayed. If you
          believe content infringes your rights, please contact Reddit directly.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">Limitation of Liability</h2>
        <p>
          The App is provided &ldquo;as is&rdquo; without warranties. We are not
          liable for any damages arising from your use of the App.
        </p>

        <h2 className="text-lg font-semibold text-white pt-2">Changes</h2>
        <p>
          We may update these terms at any time. Continued use after changes
          constitutes acceptance.
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
