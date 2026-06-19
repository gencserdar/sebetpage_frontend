import { useState } from "react";
import { Link } from "react-router-dom";
import AppAmbientGlow from "../components/AppAmbientGlow";
import PasswordRequirements from "../components/PasswordRequirements";
import { register, resendActivationEmail } from "../services/authService";
import { isPasswordValid } from "../utils/passwordPolicy";
import { appPageClass, appSurfaceCardClass } from "../theme/appTheme";

type LegalDocument = "privacy" | "terms";

const LEGAL_COPY: Record<LegalDocument, { title: string; body: string[] }> = {
  privacy: {
    title: "Privacy Policy",
    body: [
      "We collect the information needed to create and protect your account, including your name, username, email address, encrypted password, profile details, uploaded images, friendships, community activity, messages, device/session data, and basic technical logs.",
      "We use this information to provide the service, deliver account security features, show your profile and content to people you interact with, prevent abuse, improve reliability, and send important account emails such as activation, password reset, and security notices.",
      "Private messages are processed to deliver chat features such as sending, editing, deleting, read states, typing indicators, and notifications. We do not sell your personal information.",
      "We may use trusted infrastructure providers for hosting, databases, storage, email delivery, search, and security monitoring. These providers may process data only as needed to operate the service.",
      "You can update your profile information, freeze your account, or permanently delete your account from Settings. Account deletion removes your account credentials, profile, social graph data, search listing, and active sessions, subject to technical backups and legal obligations.",
      "We keep data only for as long as needed to provide the service, protect users, comply with law, resolve disputes, and maintain backups. Security logs and backup copies may remain for a limited period before deletion.",
      "By using the service, you confirm that the information you provide is accurate and that you understand how your data is used to operate and secure the platform.",
    ],
  },
  terms: {
    title: "Terms of Service",
    body: [
      "By creating an account, you agree to use this service responsibly and only for lawful purposes. You are responsible for the activity that happens under your account.",
      "You must not harass, threaten, impersonate, exploit, spam, or abuse other users. You must not upload illegal, harmful, hateful, sexually exploitative, or rights-infringing content.",
      "You must not attempt to disrupt the service, bypass security controls, scrape private data, access accounts or systems without permission, or use automated abuse tools.",
      "You keep ownership of the content you create, but you grant us the limited permission needed to host, display, transmit, store, moderate, and technically process that content as part of the service.",
      "We may remove content, limit access, freeze accounts, or terminate accounts when needed to protect users, comply with law, enforce these terms, or preserve platform integrity.",
      "The service is provided as available. We work to keep it reliable and secure, but we cannot guarantee uninterrupted availability, error-free operation, or that every feature will remain unchanged.",
      "These terms may be updated as the service evolves. If changes are material, we will make reasonable efforts to notify users through the product or other appropriate channels.",
    ],
  },
};

function LegalModal({
  document,
  onClose,
}: {
  document: LegalDocument;
  onClose: () => void;
}) {
  const copy = LEGAL_COPY[document];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">{copy.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="indigo-scrollbar max-h-[68vh] space-y-4 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-gray-300">
          <p className="text-xs uppercase tracking-widest text-gray-500">
            Effective date: June 19, 2026
          </p>
          {copy.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [firstName, setFirst]       = useState("");
  const [lastName, setLast]         = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirmPassword, setConf]  = useState("");
  const [nickname, setNickname]     = useState("");
  const [error, setError]           = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [legalModal, setLegalModal] = useState<LegalDocument | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");

    if (!isPasswordValid(password)) {
      setError("Please meet all password requirements");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!acceptedLegal) {
      setError("Please accept the Privacy Policy and Terms of Service");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(firstName, lastName, email, password, nickname);
      setRegistered(true);
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${appPageClass} items-center justify-center`}>
      <AppAmbientGlow />

      {/* Logo & Welcome */}
      <div className="mb-8 text-center flex flex-col items-center">
        <img
          src="/img4.png"
          alt="SebetPage Logo"
          className="w-40 h-40 -mb-3" // increased size, centered
        />
        {!registered && (
          <>
            <h1 className="mt-2 text-2xl font-semibold">Join SebetPage</h1>
            <p className="text-gray-400">Create your account below</p>
          </>
        )}
      </div>



      {registered ? (
        <div className={`relative w-full max-w-md p-8 text-center ${appSurfaceCardClass}`}>
          <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
          <p className="text-gray-300 mb-4">
            We&apos;ve sent you a confirmation link. Please verify your email to log in.
          </p>
          <p className="text-gray-400 text-sm mb-6">
            The link expires in 24 hours. Didn&apos;t get it?
          </p>
          {resendSent ? (
            <p className="text-green-400 text-sm mb-6">
              If an unactivated account exists for {email}, a new link was sent.
            </p>
          ) : (
            <>
              {resendError && (
                <p className="text-red-400 text-sm mb-4">{resendError}</p>
              )}
              <button
                type="button"
                disabled={resending}
                onClick={async () => {
                  if (resending) return;
                  setResendError("");
                  setResending(true);
                  try {
                    await resendActivationEmail(email);
                    setResendSent(true);
                  } catch (err: unknown) {
                    setResendError(
                      err instanceof Error ? err.message : "Could not resend link"
                    );
                  } finally {
                    setResending(false);
                  }
                }}
                className="w-full px-6 py-2 mb-4 bg-white/10 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 rounded-lg font-semibold transition-colors flex items-center justify-center min-h-[40px]"
              >
                {resending ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  "Resend activation link"
                )}
              </button>
            </>
          )}
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-semibold transition-colors"
          >
            Go to Home
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={`relative w-full max-w-md space-y-5 p-8 ${appSurfaceCardClass}`}
        >
          {error && <div className="text-red-400 text-sm">{error}</div>}

          <input
            type="text"
            placeholder="First name"
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            value={firstName}
            onChange={(e) => setFirst(e.target.value)}
            disabled={isSubmitting}
            required
          />
          <input
            type="text"
            placeholder="Last name"
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            value={lastName}
            onChange={(e) => setLast(e.target.value)}
            disabled={isSubmitting}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Password"
              className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              disabled={isSubmitting}
              required
            />
            <PasswordRequirements password={password} />
          </div>
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              value={confirmPassword}
              onChange={(e) => {
                setConf(e.target.value);
                if (error) setError("");
              }}
              disabled={isSubmitting}
              required
            />
            <PasswordRequirements
              password={password}
              confirmPassword={confirmPassword}
              matchOnly
              visible={confirmPassword.length > 0}
            />
          </div>
          <input
            type="text"
            placeholder="Username"
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={acceptedLegal}
              onChange={(e) => {
                setAcceptedLegal(e.target.checked);
                if (error) setError("");
              }}
              disabled={isSubmitting}
              required
              className="mt-1 h-4 w-4 rounded border-white/20 bg-black/40 accent-indigo-500"
            />
            <span className="leading-relaxed">
              I agree to the{" "}
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                className="text-indigo-300 underline-offset-4 hover:underline"
              >
                Privacy Policy
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => setLegalModal("terms")}
                className="text-indigo-300 underline-offset-4 hover:underline"
              >
                Terms of Service
              </button>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !isPasswordValid(password) ||
              !confirmPassword ||
              password !== confirmPassword ||
              !acceptedLegal
            }
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-500/40 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center min-h-[40px]"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "Sign Up"
            )}
          </button>

          <div className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link to="/?login=1" className="text-blue-400 hover:underline">
              Log in
            </Link>
          </div>
        </form>
      )}
      {legalModal && (
        <LegalModal document={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}
