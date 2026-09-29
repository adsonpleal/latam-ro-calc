/** Best-effort short link for browser share actions; the complete URL remains usable. */
export async function shortenUrl(url: string, shortenerUrl: string): Promise<string> {
  try {
    const response = await fetch(`${shortenerUrl}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return url;
    const { short_url } = (await response.json()) as { short_url?: string };
    return short_url || url;
  } catch {
    return url;
  }
}
