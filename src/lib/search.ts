interface BraveResult {
  title: string;
  description: string;
  url: string;
}

export async function braveSearch(query: string): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return "";
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return "";
    const data = await res.json();
    const results: BraveResult[] = (data.web?.results ?? []).slice(0, 5);
    if (results.length === 0) return "";
    return results
      .map((r) => `[${r.title}](${r.url})\n${r.description}`)
      .join("\n\n");
  } catch {
    return "";
  }
}
