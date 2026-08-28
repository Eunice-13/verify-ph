const PUBLISHER_IMAGE_REQUEST_TIMEOUT_MS = 10_000;
const MAX_PUBLISHER_PAGE_BYTES = 1_500_000;

const IMAGE_META_NAMES = new Set([
  "og:image",
  "og:image:url",
  "twitter:image",
  "twitter:image:src",
]);

const IMAGE_URL_ATTRIBUTES = [
  "data-src",
  "data-lazy-src",
  "data-original",
  "data-image",
  "src",
] as const;

const ARTICLE_SCHEMA_TYPES = new Set([
  "article",
  "newsarticle",
  "reportagenewsarticle",
]);

const NON_ARTICLE_IMAGE_HINTS = /(?:logo|icon|avatar|profile|author|advertisement|\/ads?\/|tracking|pixel|spacer|placeholder)/i;

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

function imageUrlFromTag(tag: string, pageUrl: string): string | null {
  for (const attribute of IMAGE_URL_ATTRIBUTES) {
    const imageUrl = toHttpUrl(metaAttribute(tag, attribute) ?? undefined, pageUrl);
    if (imageUrl && !NON_ARTICLE_IMAGE_HINTS.test(imageUrl)) {
      return imageUrl;
    }
  }

  const srcSet = metaAttribute(tag, "data-srcset") ?? metaAttribute(tag, "srcset");
  if (!srcSet) {
    return null;
  }

  // Publishers generally list srcset candidates from smaller to larger. Pick
  // the last usable one so a card does not receive a tiny thumbnail.
  const candidates = srcSet
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .reverse();

  for (const candidate of candidates) {
    const imageUrl = toHttpUrl(candidate, pageUrl);
    if (imageUrl && !NON_ARTICLE_IMAGE_HINTS.test(imageUrl)) {
      return imageUrl;
    }
  }

  return null;
}

function imageUrlFromImageValue(value: unknown, pageUrl: string): string | null {
  if (typeof value === "string") {
    return toHttpUrl(value, pageUrl);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const imageUrl = imageUrlFromImageValue(item, pageUrl);
      if (imageUrl) return imageUrl;
    }
    return null;
  }

  if (value && typeof value === "object") {
    const candidate = value as { url?: unknown; contentUrl?: unknown };
    return (
      imageUrlFromImageValue(candidate.url, pageUrl) ??
      imageUrlFromImageValue(candidate.contentUrl, pageUrl)
    );
  }

  return null;
}

function hasArticleSchemaType(value: unknown): boolean {
  const types = Array.isArray(value) ? value : [value];
  return types.some(
    (type) => typeof type === "string" && ARTICLE_SCHEMA_TYPES.has(type.toLowerCase()),
  );
}

function imageUrlFromArticleSchema(value: unknown, pageUrl: string): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const imageUrl = imageUrlFromArticleSchema(item, pageUrl);
      if (imageUrl) return imageUrl;
    }
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (hasArticleSchemaType(record["@type"])) {
    const imageUrl = imageUrlFromImageValue(record.image, pageUrl);
    if (imageUrl && !NON_ARTICLE_IMAGE_HINTS.test(imageUrl)) {
      return imageUrl;
    }
  }

  for (const nestedValue of Object.values(record)) {
    const imageUrl = imageUrlFromArticleSchema(nestedValue, pageUrl);
    if (imageUrl) return imageUrl;
  }

  return null;
}

function imageUrlFromJsonLd(html: string, pageUrl: string): string | null {
  const scripts = html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json[^"']*["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];

  for (const script of scripts) {
    const content = script
      .replace(/^<script\b[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();

    try {
      const imageUrl = imageUrlFromArticleSchema(JSON.parse(content), pageUrl);
      if (imageUrl) return imageUrl;
    } catch {
      // Malformed JSON-LD should not stop us from checking the article body.
    }
  }

  return null;
}

function imageUrlFromArticleBody(html: string, pageUrl: string): string | null {
  // Prefer a semantic article/main container. Some publishers use neither,
  // so figure elements are the next safest content-focused fallback.
  const contentBlocks = html.match(/<(?:article|main|figure)\b[^>]*>[\s\S]*?<\/(?:article|main|figure)>/gi) ?? [];

  for (const block of contentBlocks) {
    const imageTags = block.match(/<img\b[^>]*>/gi) ?? [];
    for (const tag of imageTags) {
      const imageUrl = imageUrlFromTag(tag, pageUrl);
      if (imageUrl) return imageUrl;
    }
  }

  return null;
}

/**
 * Extracts a publisher-provided article image. It prefers Open Graph/Twitter
 * metadata, then NewsArticle JSON-LD, then a real image in the article body.
 * The returned URL is always an http(s) URL and supports relative paths.
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

  return imageUrlFromJsonLd(html, pageUrl) ?? imageUrlFromArticleBody(html, pageUrl);
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
