import QRCode from "qrcode"

const COLORS = {
  dark: "#1C1814",
  light: "#F7F1E6",
} as const

const BASE = {
  errorCorrectionLevel: "H" as const,
  margin: 2,
  color: COLORS,
}

export async function drawQr(
  canvas: HTMLCanvasElement,
  url: string,
  size: number,
) {
  await QRCode.toCanvas(canvas, url, {
    ...BASE,
    width: size,
  })
}

export async function qrSvg(url: string, size = 1024) {
  return QRCode.toString(url, {
    ...BASE,
    type: "svg",
    width: size,
  })
}

export async function qrPngDataUrl(url: string, size = 1024) {
  return QRCode.toDataURL(url, {
    ...BASE,
    width: size,
  })
}
