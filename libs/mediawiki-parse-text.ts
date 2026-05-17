const DEFAULT_API = "https://en.uesp.net/w/api.php";

/**
 * MediaWiki `action=parse` → HTML in `parse.text["*"]`.
 */
export async function fetchMediaWikiParseHtml(options: {
  page: string;
  userAgent: string;
  apiUrl?: string;
}): Promise<string> {
  const requestUrl = new URL(options.apiUrl ?? DEFAULT_API);
  requestUrl.searchParams.set("action", "parse");
  requestUrl.searchParams.set("page", options.page);
  requestUrl.searchParams.set("prop", "text");
  requestUrl.searchParams.set("format", "json");
  const res = await fetch(requestUrl, {
    headers: { "User-Agent": options.userAgent },
  });
  if (!res.ok) {
    throw new Error(`MediaWiki HTTP ${res.status}`);
  }
  const payload = (await res.json()) as {
    parse?: { text?: { "*": string } };
    error?: { info?: string };
  };
  if (payload.error) {
    throw new Error(payload.error.info ?? "MediaWiki API error");
  }
  const html = payload.parse?.text?.["*"];
  if (!html) {
    throw new Error("Missing parse.text from MediaWiki response");
  }
  return html;
}
