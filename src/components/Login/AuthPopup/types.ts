export type AuthMode = "login" | "forgot";

export interface AuthPopupProps {
  initialMode: AuthMode;
  onSubmit: () => void;
  onClose: () => void;
}

export interface AuthSlideImage {
  url: string;
  caption: string;
}
