import { jsPDF } from "jspdf"

export function qrPdfBlob(url: string, pngDataUrl: string) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const mark = 84
  const x = (pageW - mark) / 2
  const y = 52

  pdf.setFillColor(242, 234, 220)
  pdf.rect(0, 0, pageW, pageH, "F")

  pdf.setDrawColor(28, 24, 20)
  pdf.setLineWidth(0.2)
  pdf.rect(12, 12, pageW - 24, pageH - 24)

  pdf.setTextColor(194, 77, 29)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8)
  pdf.text("PLATE  //  SCAN TARGET", pageW / 2, 28, { align: "center" })

  pdf.setFillColor(247, 241, 230)
  pdf.rect(x - 4, y - 4, mark + 8, mark + 8, "F")
  pdf.addImage(pngDataUrl, "PNG", x, y, mark, mark)

  pdf.setTextColor(28, 24, 20)
  pdf.setFontSize(11)
  const lines = pdf.splitTextToSize(url, pageW - 48) as string[]
  pdf.text(lines, pageW / 2, y + mark + 16, { align: "center" })

  pdf.setTextColor(107, 98, 88)
  pdf.setFontSize(8)
  pdf.text(
    "A camera scan opens this address in the browser.",
    pageW / 2,
    y + mark + 16 + lines.length * 5 + 8,
    { align: "center" },
  )

  pdf.text("ECC-H  ·  KEEP THE QUIET BORDER", pageW / 2, pageH - 22, {
    align: "center",
  })

  return pdf.output("blob")
}
