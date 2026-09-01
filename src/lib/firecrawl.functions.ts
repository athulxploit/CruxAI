import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { friendly, logServer } from "@/lib/errors";

export interface SearchResult {
  title: string;
  url: string;
  description?: string;
  markdown?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  error?: string;
}

async function firecrawlSearch(
  query: string,
  opts: { limit: number; scrape: boolean },
): Promise<SearchResult[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not configured");

  const body: Record<string, unknown> = { query, limit: opts.limit };
  if (opts.scrape) {
    body.scrapeOptions = { formats: ["markdown"], onlyMainContent: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.scrape ? 45_000 : 15_000);
  let res: Response;
  try {
    res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Firecrawl ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = (await res.json().catch(() => ({}))) as {
    data?: { web?: SearchResult[] } | SearchResult[];
  };
  const raw = Array.isArray(json.data) ? json.data : (json.data?.web ?? []);
  return raw.slice(0, opts.limit).map((r) => ({
    title: r.title ?? r.url,
    url: r.url,
    description: r.description,
    markdown: r.markdown,
  }));
}

function validateQuery(input: { query: string }) {
  if (!input?.query || typeof input.query !== "string") {
    throw new Error("Please enter something to search.");
  }
  const q = input.query.trim().slice(0, 500);
  if (!q) throw new Error("Please enter something to search.");
  return { query: q };
}

export const webSearchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(validateQuery)
  .handler(async ({ data }): Promise<SearchResponse> => {
    try {
      const results = await firecrawlSearch(data.query, { limit: 6, scrape: false });
      return { results };
    } catch (err) {
      logServer("firecrawl.search", err);
      return { results: [], error: friendly(err, "Web search is temporarily unavailable.") };
    }
  });

export const deepResearchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(validateQuery)
  .handler(async ({ data }): Promise<SearchResponse> => {
    try {
      const results = await firecrawlSearch(data.query, { limit: 6, scrape: true });
      return { results };
    } catch (err) {
      logServer("firecrawl.deep", err);
      return { results: [], error: friendly(err, "Deep research is temporarily unavailable.") };
    }
  });

// Scrape a list of specific URLs (used for founder social profile lookup).
async function firecrawlScrapeOne(url: string, key: string): Promise<SearchResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => ({}))) as {
      data?: { markdown?: string; metadata?: { title?: string; description?: string } };
      markdown?: string;
      metadata?: { title?: string; description?: string };
    };
    const md = json.data?.markdown ?? json.markdown ?? "";
    const meta = json.data?.metadata ?? json.metadata ?? {};
    return {
      title: meta.title || url,
      url,
      description: meta.description,
      markdown: md ? md.slice(0, 4000) : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const scrapeUrlsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { urls: string[] }) => {
    if (!input?.urls || !Array.isArray(input.urls)) throw new Error("urls required");
    return { urls: input.urls.slice(0, 6).filter((u) => /^https?:\/\//.test(u)) };
  })
  .handler(async ({ data }): Promise<SearchResponse> => {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) return { results: [], error: "Firecrawl unavailable." };
    try {
      const results = (await Promise.all(data.urls.map((u) => firecrawlScrapeOne(u, key))))
        .filter((r): r is SearchResult => r !== null);
      return { results };
    } catch (err) {
      logServer("firecrawl.scrape", err);
      return { results: [], error: friendly(err, "Scrape temporarily unavailable.") };
    }
  });
