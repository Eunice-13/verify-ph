import { timingSafeEqual } from "node:crypto";

import { ingestTrustedRssFeeds } from "@/lib/rss";

export const dynamic = "force-dynamic";
// cron-job.org closes requests after 30 seconds, so leave a small buffer.
export const maxDuration = 25;

function isAuthorized(authorizationHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret || !authorizationHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(cronSecret);

  return (
    tokenBuffer.length === secretBuffer.length &&
    timingSafeEqual(tokenBuffer, secretBuffer)
  );
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return Response.json(
      { error: "Server configuration is missing CRON_SECRET." },
      { status: 500 },
    );
  }

  if (!isAuthorized(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await ingestTrustedRssFeeds();
    const status = result.status === "failed" ? 502 : 200;

    return Response.json(result, { status });
  } catch (error) {
    console.error("RSS ingestion route failed:", error);

    return Response.json(
      { error: "Unable to complete RSS ingestion." },
      { status: 500 },
    );
  }
}
