import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { drawQr, qrPngDataUrl, qrSvg } from "./lib/qr"
import { downloadName, normalizeUrl } from "./lib/url"

const SAMPLE = "https://example.com"
const DISPLAY_SIZE = 320
const EXPORT_SIZE = 1024

function Finder({ className }: { className?: string }) {
  return (
    <div
      className={`relative size-14 border-[5px] border-ink ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="absolute inset-[3px] border-[9px] border-ink" />
    </div>
  )
}

function downloadBlob(filename: string, blob: Blob) {
  const href = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = href
  link.download = filename
  link.click()
  URL.revokeObjectURL(href)
}

export default function App() {
  const inputId = useId()
  const errorId = useId()
  const hintId = useId()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [value, setValue] = useState("")
  const [encoded, setEncoded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!encoded || !canvasRef.current) return
    let cancelled = false
    setBusy(true)
    drawQr(canvasRef.current, encoded, DISPLAY_SIZE)
      .then(() => {
        if (cancelled) return
        setBusy(false)
        if (window.innerWidth < 1024) {
          canvasRef.current?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "auto"
              : "smooth",
            block: "center",
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBusy(false)
          setError("Could not draw that code.")
          setEncoded(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [encoded])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 2200)
    return () => window.clearTimeout(timer)
  }, [notice])

  function generateFrom(raw: string, { persist }: { persist: boolean }) {
    const result = normalizeUrl(raw)
    if (!result.ok) {
      setError(result.error)
      if (persist) setEncoded(null)
      setWarning(null)
      return false
    }

    setError(null)
    setEncoded(result.url)
    setWarning(
      result.url.length > 500
        ? "Long links make denser marks. Shorter URLs scan more reliably."
        : null,
    )
    if (persist) setValue(result.url)
    return true
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    generateFrom(value, { persist: true })
  }

  async function savePng() {
    if (!encoded) return
    const dataUrl = await qrPngDataUrl(encoded, EXPORT_SIZE)
    const response = await fetch(dataUrl)
    downloadBlob(`${downloadName(encoded)}.png`, await response.blob())
    setNotice("PNG saved")
  }

  async function saveSvg() {
    if (!encoded) return
    const markup = await qrSvg(encoded, EXPORT_SIZE)
    downloadBlob(
      `${downloadName(encoded)}.svg`,
      new Blob([markup], { type: "image/svg+xml" }),
    )
    setNotice("SVG saved")
  }

  async function copyPng() {
    if (!encoded) return
    try {
      const dataUrl = await qrPngDataUrl(encoded, EXPORT_SIZE)
      const blob = await (await fetch(dataUrl)).blob()
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      setNotice("Copied to clipboard")
    } catch {
      setNotice("Could not copy — download instead")
    }
  }

  const destination = encoded

  return (
    <div className="min-h-svh bg-shell px-3 py-3 sm:px-5 sm:py-5">
      <div className="paper-grain relative mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-[1180px] flex-col overflow-hidden rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:min-h-[calc(100svh-2.5rem)]">
        <span className="corner-bracket tl" />
        <span className="corner-bracket tr" />
        <span className="corner-bracket bl" />
        <span className="corner-bracket br" />

        <header className="relative z-10 flex items-center justify-between gap-4 border-b border-rule px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center border border-ink/80" aria-hidden="true">
              <span className="block size-3 bg-mark" />
            </span>
            <p className="font-serif text-xl tracking-tight text-ink">Plate</p>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            Client-side · ECC-H
          </p>
        </header>

        <main className="relative z-10 grid flex-1 lg:grid-cols-2">
          <section className="flex flex-col justify-center border-b border-rule px-5 py-8 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mark">
                01 // Destination
              </p>
              <h1 className="mt-4 max-w-[16ch] font-serif text-[2.6rem] leading-[1.05] tracking-tight text-ink sm:text-5xl">
                Paste a link. Get a mark that opens it.
              </h1>
              <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted">
                The QR stores your URL. A camera reads those squares and sends
                the scanner to that page — no account, no extra redirect.
              </p>

              <form className="mt-8" onSubmit={onSubmit}>
                <label
                  htmlFor={inputId}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink"
                >
                  Destination URL
                </label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <input
                    id={inputId}
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    placeholder="your-site.com/page"
                    value={value}
                    onChange={(event) => {
                      setValue(event.target.value)
                      if (error) setError(null)
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : hintId}
                    className="h-12 min-h-12 w-full border border-ink/20 bg-plate px-4 font-mono text-sm text-ink outline-none transition-colors placeholder:text-muted/60 hover:border-ink/40 focus:border-ink focus:ring-2 focus:ring-mark/40"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-12 min-h-12 shrink-0 items-center justify-center bg-ink px-6 text-sm font-medium text-plate transition-colors hover:bg-mark active:bg-mark-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mark focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  >
                    Make the mark
                  </button>
                </div>
                <p id={hintId} className="mt-2 text-sm text-muted">
                  https is added if you leave it off.{" "}
                  <button
                    type="button"
                    className="underline decoration-rule underline-offset-4 transition-colors hover:text-ink hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mark"
                    onClick={() => {
                      setValue(SAMPLE)
                      generateFrom(SAMPLE, { persist: true })
                    }}
                  >
                    Try example.com
                  </button>
                </p>
                <div aria-live="polite">
                  {error ? (
                    <p id={errorId} className="mt-2 text-sm text-mark-ink">
                      {error}
                    </p>
                  ) : null}
                  {warning ? (
                    <p className="mt-2 text-sm text-muted">{warning}</p>
                  ) : null}
                </div>
              </form>
            </div>
          </section>

          <section
            id="plate"
            className="relative flex flex-col bg-paper-2 px-5 py-8 sm:px-8 sm:py-10"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mark">
                  02 // Plate
                </p>
                <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink">
                  {destination ? "Ready to scan" : "Awaiting destination"}
                </h2>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                {busy ? "Drawing" : destination ? "Live" : "Idle"}
              </p>
            </div>

            <div className="relative mx-auto grid w-full max-w-[420px] flex-1 place-items-center">
              <span className="crop-mark tl -top-2 -left-2" />
              <span className="crop-mark tr -top-2 -right-2" />
              <span className="crop-mark bl -bottom-2 -left-2" />
              <span className="crop-mark br -bottom-2 -right-2" />

              <div className="relative aspect-square w-full max-w-[360px] border border-ink/15 bg-plate p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_18px_40px_rgba(28,24,20,0.08)]">
                <canvas
                  ref={canvasRef}
                  width={DISPLAY_SIZE}
                  height={DISPLAY_SIZE}
                  className={`size-full ${destination ? "block" : "hidden"}`}
                  aria-label={
                    destination
                      ? `QR code for ${destination}`
                      : "QR code preview"
                  }
                />
                {!destination ? (
                  <div className="relative size-full">
                    <Finder className="absolute top-0 left-0" />
                    <Finder className="absolute top-0 right-0" />
                    <Finder className="absolute bottom-0 left-0" />
                    <p className="absolute inset-0 m-auto h-fit max-w-[14ch] text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                      Enter a URL to compose
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <dl className="border-t border-rule pt-4">
                <div className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                    Encoded
                  </dt>
                  <dd className="truncate font-mono text-xs text-ink">
                    {destination ?? "—"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-rule py-2">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                    Scan result
                  </dt>
                  <dd className="text-right text-sm text-ink">
                    {destination
                      ? "Opens this URL in the camera browser"
                      : "Nothing yet"}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={savePng}
                  disabled={!destination}
                  className="inline-flex h-11 min-h-11 items-center border border-ink/20 bg-plate px-4 text-sm text-ink transition-colors hover:border-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mark"
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={saveSvg}
                  disabled={!destination}
                  className="inline-flex h-11 min-h-11 items-center border border-ink/20 bg-plate px-4 text-sm text-ink transition-colors hover:border-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mark"
                >
                  Download SVG
                </button>
                <button
                  type="button"
                  onClick={copyPng}
                  disabled={!destination}
                  className="inline-flex h-11 min-h-11 items-center border border-ink/20 bg-plate px-4 text-sm text-ink transition-colors hover:border-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mark"
                >
                  Copy image
                </button>
              </div>
              <p aria-live="polite" className="h-5 font-mono text-[11px] uppercase tracking-[0.18em] text-mark">
                {notice}
              </p>
            </div>
          </section>
        </main>

        <section className="relative z-10 border-t border-rule px-5 py-8 sm:px-8">
          <ol className="grid gap-6 sm:grid-cols-3">
            {[
              ["01", "Paste the page you want people to reach."],
              ["02", "We encode that URL into a high-contrast QR."],
              ["03", "A scan opens the same link in their browser."],
            ].map(([step, copy]) => (
              <li key={step}>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mark">
                  {step}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="relative z-10 grid gap-8 border-t border-rule px-5 py-8 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-ink">
              What a scan actually does
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
              A QR code is a picture of data. This one contains your URL as
              text. Phone cameras decode it and offer to open that address.
              Plate never hosts a redirect, so the mark keeps working as long
              as the destination page does.
            </p>
          </div>
          <div className="space-y-3">
            {[
              [
                "Does this expire?",
                "No. The URL is baked into the image. If the website moves, make a new mark.",
              ],
              [
                "Can I print it?",
                "Yes. Download PNG for posters or SVG for sharp print at any size. Keep the quiet white border.",
              ],
              [
                "Is my link stored here?",
                "No. Encoding happens in your browser. Nothing is sent to a server.",
              ],
            ].map(([question, answer]) => (
              <details
                key={question}
                className="border-b border-rule pb-3 open:pb-3"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                  {question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
