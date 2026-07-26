"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type Toast = {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
};

type ToastContextValue = {
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: Toast["tone"] = "info") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, notify, dismiss }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastViewport() {
  const { toasts, dismiss } = useToastForViewport();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto w-full max-w-md cursor-pointer rounded-[var(--radius-md)] border px-4 py-3 text-[13px] shadow-[var(--elevation-300)] ${
            t.tone === "success"
              ? "border-transparent bg-bg-inverse text-text-inverse"
              : t.tone === "error"
                ? "border-transparent bg-bg-danger text-text-on-color"
                : "border-border-default bg-bg-primary text-text-primary"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// tiny helper so the viewport can read context without re-rendering consumers
function useToastForViewport() {
  const ctx = useContext(ToastContext);
  return ctx ?? { toasts: [], dismiss: () => {} };
}
