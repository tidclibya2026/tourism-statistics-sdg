type AnalyticsEnvironment = {
  VITE_ANALYTICS_ENDPOINT?: string;
  VITE_ANALYTICS_WEBSITE_ID?: string;
};

export function getAnalyticsConfig(environment: AnalyticsEnvironment) {
  const endpoint = environment.VITE_ANALYTICS_ENDPOINT?.trim().replace(
    /\/+$/,
    ""
  );
  const websiteId = environment.VITE_ANALYTICS_WEBSITE_ID?.trim();

  if (!endpoint || !websiteId) return null;

  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  } catch {
    return null;
  }

  return { scriptUrl: `${endpoint}/umami`, websiteId };
}

export function installAnalytics(
  environment: AnalyticsEnvironment = import.meta.env as AnalyticsEnvironment,
  documentRef: Document | undefined = typeof document === "undefined"
    ? undefined
    : document
) {
  const config = getAnalyticsConfig(environment);
  if (
    !config ||
    !documentRef ||
    documentRef.querySelector("script[data-tourism-analytics]")
  )
    return false;

  const script = documentRef.createElement("script");
  script.defer = true;
  script.src = config.scriptUrl;
  script.dataset.websiteId = config.websiteId;
  script.dataset.tourismAnalytics = "enabled";
  documentRef.head.appendChild(script);
  return true;
}
