import { TurnstileWidget } from "@/components/share/TurnstileWidget";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("TurnstileWidget", () => {
  const mockRender = vi.fn();
  const mockRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.head.innerHTML = "";
    document.body.innerHTML = "";

    mockRender.mockReturnValue("widget-id-123");

    window.turnstile = {
      render: (container, params) => {
        mockRender(container, params);
        return "widget-id-123";
      },
      remove: (id) => {
        mockRemove(id);
      },
    };
  });

  afterEach(() => {
    cleanup();
    delete window.turnstile;
  });

  it("renders container div with provided className", () => {
    const { container } = render(
      <TurnstileWidget
        siteKey="0x4AAAAAA"
        onSuccess={vi.fn()}
        className="custom-turnstile-class"
      />,
    );

    const div = container.querySelector("div");
    expect(div).toBeInTheDocument();
    expect(div).toHaveClass("custom-turnstile-class");
  });

  it("injects script tag into document.head if not already present", () => {
    render(<TurnstileWidget siteKey="0x4AAAAAA" onSuccess={vi.fn()} />);

    const script = document.getElementById(
      "cf-turnstile-script",
    ) as HTMLScriptElement;
    expect(script).toBeInTheDocument();
    expect(script.src).toContain(
      "challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    );
    expect(script.async).toBe(true);
    expect(script.defer).toBe(true);
  });

  it("calls window.turnstile.render when script loads and handles callbacks", () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(
      <TurnstileWidget
        siteKey="test-site-key-xyz"
        action="custom_action"
        onSuccess={onSuccess}
        onError={onError}
      />,
    );

    const script = document.getElementById(
      "cf-turnstile-script",
    ) as HTMLScriptElement;
    expect(script).toBeInTheDocument();

    // Trigger script onload
    script.onload!(new Event("load"));

    expect(mockRender).toHaveBeenCalledTimes(1);
    const [containerEl, params] = mockRender.mock.calls[0];
    expect(containerEl).toBeInstanceOf(HTMLDivElement);
    expect(params.sitekey).toBe("test-site-key-xyz");
    expect(params.action).toBe("custom_action");
    expect(params.theme).toBe("auto");

    // Test success callback
    params.callback("token-sample-abc");
    expect(onSuccess).toHaveBeenCalledWith("token-sample-abc");

    // Test error callback
    params["error-callback"]();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("calls window.turnstile.remove on unmount", () => {
    const { unmount } = render(
      <TurnstileWidget siteKey="0x4AAAAAA" onSuccess={vi.fn()} />,
    );

    const script = document.getElementById(
      "cf-turnstile-script",
    ) as HTMLScriptElement;
    script.onload!(new Event("load"));

    unmount();

    expect(mockRemove).toHaveBeenCalledWith("widget-id-123");
  });

  it("does not inject script or call render when siteKey is empty", () => {
    render(<TurnstileWidget siteKey="" onSuccess={vi.fn()} />);

    const script = document.getElementById("cf-turnstile-script");
    expect(script).not.toBeInTheDocument();
    expect(mockRender).not.toHaveBeenCalled();
  });

  it("reuses existing script tag if already in DOM", () => {
    const existingScript = document.createElement("script");
    existingScript.id = "cf-turnstile-script";
    document.head.appendChild(existingScript);

    render(<TurnstileWidget siteKey="0x4AAAAAA" onSuccess={vi.fn()} />);

    const scripts = document.querySelectorAll("#cf-turnstile-script");
    expect(scripts.length).toBe(1);
    expect(mockRender).toHaveBeenCalledTimes(1);
  });
});
