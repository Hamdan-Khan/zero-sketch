import {
  APP_URL,
  LIBRARY_URL,
  LOCALSTORAGE_MOBILE_BANNER_KEY,
} from "@/lib/constants";
import { isMobileDevice } from "@/lib/utils";
import { Button } from "@cloudflare/kumo";
import { createFileRoute } from "@tanstack/react-router";
import { Canvas, createCanvasStore } from "@zero-sketch/canvas";
import { LibraryRegistry } from "@zero-sketch/models";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Classic } from "../components/loading-ui/classic";

export const Route = createFileRoute("/")({
  ssr: false,
  pendingComponent: LoadingScreen,
  head: () => ({
    meta: [
      {
        title: "ZeroSketch | System Design Canvas",
      },
      {
        name: "title",
        content:
          "ZeroSketch | A high level system design tool | Open Source & Free to use",
      },
      {
        name: "description",
        content:
          "Interactive drag & drop system design canvas to sketch software architecture, export diagrams, and manage icon libraries directly in your browser.",
      },
      {
        property: "og:title",
        content:
          "ZeroSketch | A high level system design tool | Open Source & Free to use",
      },
      {
        property: "og:description",
        content:
          "Interactive drag & drop system design canvas to sketch software architecture, export diagrams, and manage icon libraries directly in your browser.",
      },
      {
        property: "og:url",
        content: `${APP_URL}/`,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: `${APP_URL}/`,
      },
    ],
  }),
  component: HomeComponent,
  validateSearch: (search) => searchSchema.parse(search),
});

const searchSchema = z.object({
  diagram: z.string().optional(),
  libraryId: z.string().optional(),
});

function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground select-none">
      <div className="flex flex-col items-center gap-3">
        <Classic className="size-6 text-foreground" />
        <span className="text-xs font-medium text-muted-foreground tracking-wide">
          Loading canvas...
        </span>
      </div>
    </div>
  );
}

function MobileBanner() {
  const isMobile = useMemo(() => isMobileDevice(), []);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LOCALSTORAGE_MOBILE_BANNER_KEY) === "true";
  });

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem(LOCALSTORAGE_MOBILE_BANNER_KEY, "true");
    } catch {
      // ignore
    }
  };
  if (isMobile && !bannerDismissed) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-surface p-6 text-center select-none">
        <img src="logo.svg" alt="" width={100} />
        <h2 className="text-2xl font-semibold text-kumo-default tracking-tighter">
          ZeroSketch is recommended to be used on desktop devices.
        </h2>
        <Button
          variant="primary"
          size="base"
          onClick={handleDismissBanner}
          className="mb-24"
        >
          Continue anyway
        </Button>
      </div>
    );
  }
}

function HomeComponent() {
  const canvasState = useMemo(
    () => createCanvasStore({ nodes: [], edges: [] }),
    [],
  );
  const libraryRegistry = useMemo(() => {
    return new LibraryRegistry({ url: LIBRARY_URL });
  }, []);

  return (
    <>
      <h1 className="sr-only">ZeroSketch System Design Canvas</h1>
      <MobileBanner />
      <Canvas libraryRegistry={libraryRegistry} canvasState={canvasState} />
    </>
  );
}
