import qrcode from 'qrcode-generator'

/**
 * Render QR code for text into container element (canvas in a .qr-box div).
 * Clears container first.
 */
export function makeQR(
  text: string,
  container: HTMLElement,
  cellSize?: number
): void {
  container.innerHTML = ''
  const typeNumber = 0 // auto
  const errorLevel = 'M'
  const qr = qrcode(typeNumber, errorLevel)
  qr.addData(text)
  qr.make()

  const size = qr.getModuleCount()
  const scale = cellSize ?? Math.max(2, Math.min(5, Math.floor(280 / size)))
  const canvas = document.createElement('canvas')
  const px = size * scale + scale * 2
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, px, px)
  ctx.fillStyle = '#000'
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect((c + 1) * scale, (r + 1) * scale, scale, scale)
      }
    }
  }

  const box = document.createElement('div')
  box.className = 'qr-box'
  box.appendChild(canvas)
  container.appendChild(box)
}
