// src/components/Modal.tsx
import { ReactNode, useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ open, onClose, children }: Props) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 1) Tam ekran blur + yarı opak perde */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[8px]" />

      {/* 2) İçerik katmanı */}
      <div className="relative z-10 w-full max-w-4xl px-4">
        {children}
      </div>
    </div>
  );
}
