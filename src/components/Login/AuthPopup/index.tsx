import AuthForgotForm from "./AuthForgotForm";
import AuthImageSlider from "./AuthImageSlider";
import AuthLoginForm from "./AuthLoginForm";
import AuthActivationModal from "./AuthActivationModal";
import AuthResetSuccessModal from "./AuthResetSuccessModal";
import { AuthPopupProps } from "./types";
import { useAuthForm } from "./useAuthForm";
import { useAuthImageSlider } from "./useAuthImageSlider";

export default function AuthPopup({ initialMode, onSubmit, onClose }: AuthPopupProps) {
  const slider = useAuthImageSlider();
  const form = useAuthForm({ initialMode, onSubmit });

  return (
    <div className="relative flex flex-col md:flex-row text-white rounded-2xl overflow-hidden w-full max-w-4xl border border-white/15 bg-app-surface/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <AuthImageSlider
        sliderRef={slider.sliderRef}
        currentIndex={slider.currentIndex}
        dragOffset={slider.dragOffset}
        isDragging={slider.isDragging}
        getPrevIndex={slider.getPrevIndex}
        getNextIndex={slider.getNextIndex}
        onGoToSlide={slider.goToSlide}
        onStart={slider.handleStart}
        onMove={slider.handleMove}
        onEnd={slider.handleEnd}
      />

      <div className="md:w-1/2 p-12 relative">
        <h2 className="text-2xl font-bold mb-2">{form.title}</h2>

        {form.mode === "login" && (
          <AuthLoginForm
            email={form.email}
            password={form.password}
            rememberMe={form.rememberMe}
            error={form.error}
            loading={form.loading}
            onEmailChange={form.setEmail}
            onPasswordChange={form.setPassword}
            onRememberMeChange={form.setRememberMe}
            onForgotPassword={() => form.setMode("forgot")}
            onSubmit={form.handleSubmit}
          />
        )}

        {form.mode === "forgot" && (
          <AuthForgotForm
            email={form.email}
            error={form.error}
            onEmailChange={form.setEmail}
            onBackToLogin={() => form.setMode("login")}
            onSubmit={form.handleSubmit}
          />
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition duration-300"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {form.showResetPopup && (
          <AuthResetSuccessModal
            onBackToLogin={() => {
              form.setShowResetPopup(false);
              form.setMode("login");
            }}
          />
        )}

        {form.showActivationPopup && (
          <AuthActivationModal
            email={form.email}
            onClose={() => form.setShowActivationPopup(false)}
          />
        )}
      </div>
    </div>
  );
}
