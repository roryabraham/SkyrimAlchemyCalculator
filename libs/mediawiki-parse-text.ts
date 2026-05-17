const DEFAULT_API = "https://en.uesp.net/w/api.php";

/**
 * MediaWiki `action=parse` → HTML in `parse.text["*"]`.
 */
export async function fetchMediaWikiParseHtml(options: {
  page: string;
  userAgent: string;
  apiUrl?: string;
}): Promise<string> {
  const u = new URL(options.apiUrl ?? DEFAULT_API);
  u.searchParams.set("action", "parse");
  u.searchParams.set("page", options.page);
  u.searchParams.set("prop", "text");
  u.searchParams.set("format", "json");
  const res = await fetch(u, {
    headers: { "User-Agent": options.userAgent },
  });
  if (!res.ok) {
    throw new Error(`MediaWiki HTTP ${res.status}`);
  }
  const j = (await res.json()) as {
    parse?: { text?: { "*": string } };
    error?: { info?: string };
  };
  if (j.error) {
    throw new Error(j.error.info ?? "MediaWiki API error");
  }
  const html = j.parse?.text?.["*"];
  if (!html) {
    throw new Error("Missing parse.text from MediaWiki response");
  }
  return html;
}
