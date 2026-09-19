import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { qrPdfBlob } from "./lib/pdf"
import { drawQr, qrPngDataUrl, qrSvg } from "./lib/qr"
import { downloadName, normalizeUrl } from "./lib/url"

const SAMPLE = "https://example.com"
const DISPLAY_SIZE = 320
const EXPORT_SIZE = 1024

const exportBtnClass =
  "inline-flex h-11 min-h-11 w-full items-center justify-center border border-ink/20 bg-plate px-3 text-sm text-ink transition-colors hover:border-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mark"

function Finder({ className }: { className?: string }) {
  return (
    <div
      className={`relative size-10 border-[4px] border-ink sm:size-14 sm:border-[5px] ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="absolute inset-[3px] border-[7px] border-ink sm:border-[9px]" />
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

  async function savePdf() {
    if (!encoded) return
    const dataUrl = await qrPngDataUrl(encoded, EXPORT_SIZE)
    downloadBlob(`${downloadName(encoded)}.pdf`, qrPdfBlob(encoded, dataUrl))
    setNotice("PDF saved")
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
    <div className="min-h-svh min-w-0 bg-shell px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-5">
      <div className="paper-grain relative mx-auto flex min-h-[calc(100svh-1.5rem)] w-full min-w-0 max-w-[1180px] flex-col overflow-x-clip rounded-[20px] shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:min-h-[calc(100svh-2.5rem)] sm:rounded-[28px]">
        <span className="corner-bracket tl" />
        <span className="corner-bracket tr" />
        <span className="corner-bracket bl" />
        <span className="corner-bracket br" />

        <header className="relative z-10 flex items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:gap-4 sm:px-8 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span
              className="grid size-7 shrink-0 place-items-center border border-ink/80 sm:size-8"
              aria-hidden="true"
            >
              <span className="block size-2.5 bg-mark sm:size-3" />
            </span>
            <p className="font-serif text-lg tracking-tight text-ink sm:text-xl">
              Plate
            </p>
          </div>
          <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:text-[11px] sm:tracking-[0.22em]">
            <span className="hidden sm:inline">Client-side · </span>ECC-H
          </p>
        </header>

        <main className="relative z-10 grid min-w-0 flex-1 lg:grid-cols-2">
          <section className="flex min-w-0 flex-col justify-center border-b border-rule px-4 py-6 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mark sm:text-[11px] sm:tracking-[0.22em]">
                01 // Destination
              </p>
              <h1 className="mt-3 max-w-[16ch] font-serif text-[2rem] leading-[1.08] tracking-tight text-ink min-[400px]:text-[2.35rem] sm:mt-4 sm:text-5xl">
                Paste a link. Get a mark that opens it.
              </h1>
              <p className="mt-4 max-w-md text-pretty text-[0.95rem] leading-relaxed text-muted sm:mt-5 sm:text-base">
                The QR stores your URL. A camera reads those squares and sends
                the scanner to that page — no account, no extra redirect.
              </p>

              <form className="mt-6 sm:mt-8" onSubmit={onSubmit}>
                <label
                  htmlFor={inputId}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink sm:text-[11px]"
                >
                  Destination URL
                </label>
                <div className="mt-2 flex flex-col gap-3 min-[520px]:flex-row lg:flex-col xl:flex-row">
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
                    className="h-12 min-h-12 w-full min-w-0 border border-ink/20 bg-plate px-3 font-mono text-sm text-ink outline-none transition-colors placeholder:text-muted/60 hover:border-ink/40 focus:border-ink focus:ring-2 focus:ring-mark/40 sm:px-4"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-12 min-h-12 w-full shrink-0 items-center justify-center bg-ink px-6 text-sm font-medium text-plate transition-colors hover:bg-mark active:bg-mark-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mark focus-visible:ring-offset-2 focus-visible:ring-offset-paper min-[520px]:w-auto lg:w-full xl:w-auto"
                  >
                    Make the mark
                  </button>
                </div>
                <p id={hintId} className="mt-2 text-sm leading-6 text-muted">
                  https is added if you leave it off.{" "}
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center underline decoration-rule underline-offset-4 transition-colors hover:text-ink hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mark"
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
            className="relative flex min-w-0 flex-col bg-paper-2 px-4 py-6 sm:px-8 sm:py-10"
          >
            <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6 sm:gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mark sm:text-[11px] sm:tracking-[0.22em]">
                  02 // Plate
                </p>
                <h2 className="mt-2 font-serif text-xl tracking-tight text-ink sm:text-2xl">
                  {destination ? "Ready to scan" : "Awaiting destination"}
                </h2>
              </div>
              <p className="shrink-0 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted sm:text-[11px] sm:tracking-[0.18em]">
                {busy ? "Drawing" : destination ? "Live" : "Idle"}
              </p>
            </div>

            <div className="relative mx-auto grid w-full max-w-[min(100%,420px)] flex-1 place-items-center px-2 sm:px-0">
              <span className="crop-mark tl -top-1 -left-1 sm:-top-2 sm:-left-2" />
              <span className="crop-mark tr -top-1 -right-1 sm:-top-2 sm:-right-2" />
              <span className="crop-mark bl -bottom-1 -left-1 sm:-bottom-2 sm:-left-2" />
              <span className="crop-mark br -bottom-1 -right-1 sm:-bottom-2 sm:-right-2" />

              <div className="relative aspect-square w-full max-w-[360px] border border-ink/15 bg-plate p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_18px_40px_rgba(28,24,20,0.08)] sm:p-6">
                <canvas
                  ref={canvasRef}
                  width={DISPLAY_SIZE}
                  height={DISPLAY_SIZE}
                  className={`h-auto w-full max-w-full ${destination ? "block" : "hidden"}`}
                  aria-label={
                    destination
                      ? `QR code for ${destination}`
                      : "QR code preview"
                  }
                />
                {!destination ? (
                  <div className="relative size-full min-h-[200px]">
                    <Finder className="absolute top-0 left-0" />
                    <Finder className="absolute top-0 right-0" />
                    <Finder className="absolute bottom-0 left-0" />
                    <p className="absolute inset-0 m-auto h-fit max-w-[14ch] px-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted sm:text-[11px] sm:tracking-[0.18em]">
                      Enter a URL to compose
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 min-w-0 space-y-4 sm:mt-8">
              <dl className="border-t border-rule pt-4">
                <div className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:text-[11px]">
                    Encoded
                  </dt>
                  <dd className="min-w-0 break-all font-mono text-xs text-ink sm:truncate sm:text-right">
                    {destination ?? "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 border-t border-rule py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:text-[11px]">
                    Scan result
                  </dt>
                  <dd className="text-sm text-ink sm:text-right">
                    {destination
                      ? "Opens this URL in the camera browser"
                      : "Nothing yet"}
                  </dd>
                </div>
              </dl>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={savePng}
                  disabled={!destination}
                  className={exportBtnClass}
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={saveSvg}
                  disabled={!destination}
                  className={exportBtnClass}
                >
                  Download SVG
                </button>
                <button
                  type="button"
                  onClick={savePdf}
                  disabled={!destination}
                  className={exportBtnClass}
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={copyPng}
                  disabled={!destination}
                  className={exportBtnClass}
                >
                  Copy image
                </button>
              </div>
              <p
                aria-live="polite"
                className="min-h-5 font-mono text-[10px] uppercase tracking-[0.16em] text-mark sm:text-[11px] sm:tracking-[0.18em]"
              >
                {notice}
              </p>
            </div>
          </section>
        </main>

        <section className="relative z-10 border-t border-rule px-4 py-6 sm:px-8 sm:py-8">
          <ol className="grid gap-5 sm:grid-cols-3 sm:gap-6">
            {[
              ["01", "Paste the page you want people to reach."],
              ["02", "We encode that URL into a high-contrast QR."],
              ["03", "A scan opens the same link in their browser."],
            ].map(([step, copy]) => (
              <li key={step} className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mark sm:text-[11px]">
                  {step}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="relative z-10 grid min-w-0 gap-6 border-t border-rule px-4 py-6 sm:gap-8 sm:px-8 sm:py-8 lg:grid-cols-2">
          <div className="min-w-0">
            <h2 className="font-serif text-xl tracking-tight text-ink sm:text-2xl">
              What a scan actually does
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
              A QR code is a picture of data. This one contains your URL as
              text. Phone cameras decode it and offer to open that address.
              Plate never hosts a redirect, so the mark keeps working as long
              as the destination page does.
            </p>
          </div>
          <div className="min-w-0 space-y-3">
            {[
              [
                "Does this expire?",
                "No. The URL is baked into the image. If the website moves, make a new mark.",
              ],
              [
                "Can I print it?",
                "Yes. Download PNG, SVG, or a one-page PDF. Keep the quiet border around the mark.",
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
                <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
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
