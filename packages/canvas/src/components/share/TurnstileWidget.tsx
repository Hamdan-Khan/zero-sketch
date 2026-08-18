import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          action?: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  siteKey: string;
  action?: string;
  onSuccess: (token: string) => void;
  onError?: () => void;
  className?: string;
}

export const TurnstileWidget = ({
  siteKey,
  action = "share_diagram",
  onSuccess,
  onError,
  className = "",
}: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const callbacksRef = useRef({ onSuccess, onError });
  useEffect(() => {
    callbacksRef.current = { onSuccess, onError };
  });

  useEffect(() => {
    if (!siteKey) return;
    let isMounted = true;
    let widgetId: string | null = null;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;
      try {
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "auto",
          callback: (token) => {
            if (isMounted) callbacksRef.current.onSuccess(token);
          },
          "error-callback": () => {
            if (isMounted) callbacksRef.current.onError?.();
          },
        });
      } catch (err) {
        console.error("Turnstile render error:", err);
      }
    };

    const SCRIPT_ID = "cf-turnstile-script";
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    } else {
      script.addEventListener("load", renderWidget);
    }

    return () => {
      isMounted = false;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {}
      }
    };
  }, [siteKey, action]);

  return <div ref={containerRef} className={className} />;
};
