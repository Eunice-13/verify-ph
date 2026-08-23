// TODO: Implement scheduled news fetching (RSS ingestion) endpoint.
// Triggered by an external cron job (e.g. cron-job.org) with an Authorization
// header of `Bearer ${CRON_SECRET}`.

export async function GET() {
  return new Response(null, { status: 501 });
}
