import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { LazyMotion, domAnimation } from "framer-motion";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import "./lovable-badge-hide.css";
import { initPerformanceMetrics } from "./lib/performance-metrics";

void initPerformanceMetrics();
import "./i18n";
import { registerServiceWorker } from "./pwa/registerSW";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || import.meta.env.SENTRY_DSN;

if (SENTRY_DSN && import.meta.env.PROD) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // 1.0 enviava 100% das transações — custo explosivo no primeiro pico.
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    tracePropagationTargets: ["localhost", /^https:\/\/titanloterias\.lovable\.app/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: "production",
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <LazyMotion features={domAnimation} strict>
      <App />
    </LazyMotion>
  </HelmetProvider>
);

void registerServiceWorker();
