const PUBLISHER_IMAGE_REQUEST_TIMEOUT_MS = 10_000;
const MAX_PUBLISHER_PAGE_BYTES = 1_500_000;

const IMAGE_META_NAMES = new Set([
  "og:image",
  "og:image:url",
  "twitter:image",
  "twitter:image:src",
]);

function toHttpUrl(value: string | undefined, baseUrl?: string): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim(), baseUrl);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function metaAttribute(tag: string, name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`\\b${escapedName}\\s*=\\s*(?:["']([^"']*)["']|([^\\s>]+))`, "i"),
  );

  return match?.[1] ?? match?.[2] ?? null;
}

/**
 * Extracts a publisher-provided article image from Open Graph or Twitter
 * metadata. The returned URL is always an http(s) URL and supports relative
 * image paths by resolving them against the final article page URL.
 */
export function publisherImageUrlFromHtml(html: string, pageUrl: string): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const metaName = metaAttribute(tag, "property") ?? metaAttribute(tag, "name");

    if (!metaName || !IMAGE_META_NAMES.has(metaName.toLowerCase())) {
      continue;
    }

    const imageUrl = toHttpUrl(metaAttribute(tag, "content") ?? undefined, pageUrl);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
}

/**
 * Fetches one trusted publisher article page and returns its own social-card
 * image. Failure is intentionally non-fatal: RSS ingestion must still save
 * the article even when a publisher blocks requests or has no metadata.
 */
export async function findPublisherImageUrl(articleUrl: string): Promise<string | null> {
  const safeArticleUrl = toHttpUrl(articleUrl);
  if (!safeArticleUrl) {
    return null;
  }

  try {
    const response = await fetch(safeArticleUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "VerifyPH RSS Ingestion/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(PUBLISHER_IMAGE_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && !/(?:text\/html|application\/xhtml\+xml)/i.test(contentType)) {
      return null;
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_PUBLISHER_PAGE_BYTES) {
      return null;
    }

    return publisherImageUrlFromHtml(await response.text(), response.url);
  } catch (error) {
    console.warn(
      "[publisherImage] Unable to read publisher image metadata:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
