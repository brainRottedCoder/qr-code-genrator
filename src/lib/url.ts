const ALLOWED = new Set(["http:", "https:"])

function isPlausibleHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (host === "localhost") return true
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true
  return host.includes(".")
}

export type UrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

export function normalizeUrl(raw: string): UrlResult {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, error: "Paste a link first." }
  }

  let candidate = trimmed
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`
  }

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return { ok: false, error: "That does not look like a valid URL." }
  }

  if (!ALLOWED.has(parsed.protocol)) {
    return { ok: false, error: "Use an http or https link." }
  }

  if (!parsed.hostname || !isPlausibleHost(parsed.hostname)) {
    return { ok: false, error: "Add a full domain, like example.com." }
  }

  return { ok: true, url: parsed.toString() }
}

export function downloadName(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    return `qr-${host.replace(/[^a-z0-9.-]/gi, "-")}`
  } catch {
    return "qr-code"
  }
}
