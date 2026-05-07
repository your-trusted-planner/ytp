/**
 * Signed PDF Generator
 *
 * Generates a PDF document with the document content, signature block,
 * and tamper-evident audit trail using pdf-lib.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

interface SignedPdfOptions {
  document: {
    id: string
    title: string
    description?: string
    content: string // HTML content - will be converted to plain text
  }
  signature: {
    imageData: string // Base64 PNG
    signerName: string
    signerEmail: string
    signedAt: Date
  }
  certificate: {
    id: string
    documentHash: string
    signatureHash: string
    certificateHash: string
    tier: 'STANDARD' | 'ENHANCED'
    ipAddress?: string
  }
}

/**
 * Strip HTML tags and convert to plain text
 */
function htmlToPlainText(html: string): string {
  // Remove script and style tags with their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Replace common block elements with newlines
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n')

  // Replace list items with bullets
  text = text.replace(/<li[^>]*>/gi, '\n• ')

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, '\'')

  // Clean up whitespace
  text = text.replace(/\n\s*\n/g, '\n\n') // Multiple newlines to double
  text = text.replace(/[ \t]+/g, ' ') // Multiple spaces to single
  text = text.trim()

  return text
}

/**
 * Wrap text to fit within a given width
 */
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('')
      continue
    }

    const words = paragraph.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const width = font.widthOfTextAtSize(testLine, fontSize)

      if (width <= maxWidth) {
        currentLine = testLine
      }
      else {
        if (currentLine) {
          lines.push(currentLine)
        }
        currentLine = word
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines
}

/**
 * Generate a signed PDF with document content, signature, and audit trail
 */
export async function generateSignedPdf(options: SignedPdfOptions): Promise<Uint8Array> {
  const { document, signature, certificate } = options

  // Create PDF document
  const pdfDoc = await PDFDocument.create()

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Page settings
  const pageWidth = 612 // Letter size
  const pageHeight = 792
  const margin = 50
  const contentWidth = pageWidth - margin * 2
  const lineHeight = 14
  const titleFontSize = 18
  const bodyFontSize = 11
  const smallFontSize = 9

  // Convert HTML to plain text
  const plainText = htmlToPlainText(document.content)
  const textLines = wrapText(plainText, helvetica, bodyFontSize, contentWidth)

  // Calculate pages needed
  let currentY = pageHeight - margin
  let page = pdfDoc.addPage([pageWidth, pageHeight])

  // Draw header on first page
  // Title
  page.drawText(document.title, {
    x: margin,
    y: currentY,
    size: titleFontSize,
    font: helveticaBold,
    color: rgb(0.04, 0.15, 0.25) // #0A2540
  })
  currentY -= titleFontSize + 10

  // Description if present
  if (document.description) {
    page.drawText(document.description, {
      x: margin,
      y: currentY,
      size: bodyFontSize,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4)
    })
    currentY -= lineHeight + 10
  }

  // Separator line
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: pageWidth - margin, y: currentY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8)
  })
  currentY -= 20

  // Draw document content
  for (const line of textLines) {
    // Check if we need a new page
    if (currentY < margin + 200) {
      // Leave room for signature block
      page = pdfDoc.addPage([pageWidth, pageHeight])
      currentY = pageHeight - margin
    }

    if (line === '') {
      currentY -= lineHeight / 2
      continue
    }

    page.drawText(line, {
      x: margin,
      y: currentY,
      size: bodyFontSize,
      font: helvetica,
      color: rgb(0.1, 0.1, 0.1)
    })
    currentY -= lineHeight
  }

  // Add signature block
  currentY -= 30

  // Check if we need a new page for signature block
  if (currentY < margin + 180) {
    page = pdfDoc.addPage([pageWidth, pageHeight])
    currentY = pageHeight - margin
  }

  // Signature block header
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: pageWidth - margin, y: currentY },
    thickness: 1,
    color: rgb(0.77, 0.12, 0.23) // #C41E3A
  })
  currentY -= 20

  page.drawText('ELECTRONIC SIGNATURE', {
    x: margin,
    y: currentY,
    size: 12,
    font: helveticaBold,
    color: rgb(0.77, 0.12, 0.23)
  })
  currentY -= 25

  // Embed and draw signature image
  try {
    // Remove data URL prefix if present
    const base64Data = signature.imageData.replace(/^data:image\/png;base64,/, '')
    const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes)

    // Scale signature to fit
    const sigMaxWidth = 200
    const sigMaxHeight = 60
    const sigDims = signatureImage.scale(1)
    const scale = Math.min(sigMaxWidth / sigDims.width, sigMaxHeight / sigDims.height)
    const sigWidth = sigDims.width * scale
    const sigHeight = sigDims.height * scale

    page.drawImage(signatureImage, {
      x: margin,
      y: currentY - sigHeight,
      width: sigWidth,
      height: sigHeight
    })
    currentY -= sigHeight + 15
  }
  catch (error) {
    // If signature image fails, draw placeholder text
    page.drawText('[Signature Image]', {
      x: margin,
      y: currentY,
      size: bodyFontSize,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    })
    currentY -= 50
  }

  // Signature line
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: margin + 200, y: currentY },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3)
  })
  currentY -= 15

  // Signer details
  page.drawText(signature.signerName, {
    x: margin,
    y: currentY,
    size: bodyFontSize,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1)
  })
  currentY -= lineHeight

  page.drawText(signature.signerEmail, {
    x: margin,
    y: currentY,
    size: smallFontSize,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4)
  })
  currentY -= lineHeight

  const signedDate = signature.signedAt.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long'
  })
  page.drawText(`Signed: ${signedDate}`, {
    x: margin,
    y: currentY,
    size: smallFontSize,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4)
  })
  currentY -= lineHeight + 20

  // Certificate details box
  const boxY = currentY
  const boxHeight = 85
  const boxWidth = contentWidth

  // Draw certificate box background
  page.drawRectangle({
    x: margin,
    y: boxY - boxHeight,
    width: boxWidth,
    height: boxHeight,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1
  })

  currentY = boxY - 15

  page.drawText('Signature Certificate', {
    x: margin + 10,
    y: currentY,
    size: 10,
    font: helveticaBold,
    color: rgb(0.3, 0.3, 0.3)
  })
  currentY -= 14

  page.drawText(`Certificate ID: ${certificate.id}`, {
    x: margin + 10,
    y: currentY,
    size: smallFontSize,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4)
  })
  currentY -= 12

  page.drawText(`Document Hash: ${certificate.documentHash.substring(0, 32)}...`, {
    x: margin + 10,
    y: currentY,
    size: smallFontSize,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4)
  })
  currentY -= 12

  page.drawText(`Signature Type: ${certificate.tier}`, {
    x: margin + 10,
    y: currentY,
    size: smallFontSize,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4)
  })
  currentY -= 12

  if (certificate.ipAddress) {
    page.drawText(`IP Address: ${certificate.ipAddress}`, {
      x: margin + 10,
      y: currentY,
      size: smallFontSize,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4)
    })
  }

  // Legal footer
  currentY = margin + 30

  page.drawText(
    'This document was electronically signed and is legally binding under the',
    {
      x: margin,
      y: currentY,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    }
  )
  currentY -= 10

  page.drawText(
    'Electronic Signatures in Global and National Commerce Act (ESIGN) and UETA.',
    {
      x: margin,
      y: currentY,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    }
  )

  // Set document metadata
  pdfDoc.setTitle(document.title)
  pdfDoc.setSubject('Electronically Signed Document')
  pdfDoc.setCreator('YourTrustedPlanner.com')
  pdfDoc.setProducer('pdf-lib')
  pdfDoc.setCreationDate(signature.signedAt)
  pdfDoc.setModificationDate(signature.signedAt)

  // Add custom metadata for verification
  pdfDoc.setKeywords([
    `certificate:${certificate.id}`,
    `documentHash:${certificate.documentHash}`,
    `signatureHash:${certificate.signatureHash}`
  ])

  // Serialize PDF to bytes
  return pdfDoc.save()
}

// --- Signature session shape for append/stamp ---
interface SignerSession {
  signerName: string
  signerEmail: string
  signatureData?: string | null
  signedAt: Date | number
  signerRole?: number
  signatureCertificate?: string | object | null
  fieldValues?: string | Record<string, string> | null
}

interface FieldPlacement {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  type: string
  signerRole: number
  label?: string
}

/**
 * Append signature page(s) to an existing PDF.
 * Used when an unsigned PDF exists (DOCX-based).
 */
export async function appendSignaturePages(
  existingPdfBytes: Uint8Array | ArrayBuffer,
  sessions: SignerSession[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(
    existingPdfBytes,
  )
  const regular = await doc.embedFont(
    StandardFonts.Helvetica,
  )
  const bold = await doc.embedFont(
    StandardFonts.HelveticaBold,
  )
  const italic = await doc.embedFont(
    StandardFonts.HelveticaOblique,
  )

  const pageW = 612
  const pageH = 792
  const margin = 50
  const contentW = pageW - margin * 2
  const brand = rgb(0.04, 0.15, 0.25)
  const black = rgb(0, 0, 0)
  const gray = rgb(0.4, 0.4, 0.4)
  const lightGray = rgb(0.6, 0.6, 0.6)

  // Sort: role 1 first, then ascending
  const sorted = [...sessions].sort(
    (a, b) => (a.signerRole ?? 1)
      - (b.signerRole ?? 1),
  )

  let page = doc.addPage([pageW, pageH])
  let y = pageH - margin

  // Header
  page.drawText('ELECTRONIC SIGNATURES', {
    x: margin,
    y,
    size: 14,
    font: bold,
    color: brand,
  })
  y -= 20
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageW - margin, y },
    thickness: 0.75,
    color: brand,
  })
  y -= 24

  for (const session of sorted) {
    // Check if we need a new page
    if (y < margin + 200) {
      page = doc.addPage([pageW, pageH])
      y = pageH - margin
    }

    // Signature image
    if (session.signatureData) {
      try {
        const sigData = session.signatureData
          .replace(
            /^data:image\/png;base64,/, '',
          )
        const sigBytes = Uint8Array.from(
          atob(sigData),
          c => c.charCodeAt(0),
        )
        const sigImage = await doc.embedPng(
          sigBytes,
        )
        const dims = sigImage.scaleToFit(300, 100)
        page.drawImage(sigImage, {
          x: margin,
          y: y - dims.height,
          width: dims.width,
          height: dims.height,
        })
        y -= dims.height + 10
      }
      catch (err) {
        console.error(
          'Failed to embed signature:', err,
        )
        page.drawText('[Signature on file]', {
          x: margin,
          y,
          size: 9,
          font: italic,
          color: gray,
        })
        y -= 14
      }
    }

    // Signature line
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + 250, y },
      thickness: 0.5,
      color: black,
    })
    y -= 15

    // Signer details
    page.drawText(session.signerName, {
      x: margin,
      y,
      size: 10,
      font: bold,
      color: black,
    })
    y -= 13

    page.drawText(session.signerEmail, {
      x: margin,
      y,
      size: 8,
      font: regular,
      color: gray,
    })
    y -= 11

    const signedDate = new Date(
      session.signedAt,
    ).toLocaleString('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Denver',
    })
    page.drawText(`Signed: ${signedDate}`, {
      x: margin,
      y,
      size: 8,
      font: regular,
      color: gray,
    })
    y -= 16

    // Certificate box
    const cert
      = typeof session.signatureCertificate
        === 'string'
        ? JSON.parse(
          session.signatureCertificate as string,
        )
        : session.signatureCertificate

    if (cert) {
      const boxH = 44
      page.drawRectangle({
        x: margin,
        y: y - boxH,
        width: contentW,
        height: boxH,
        color: rgb(0.96, 0.96, 0.96),
      })

      const certLines = [
        `Certificate: ${cert.certificateId}`,
        `Doc Hash: ${
          cert.documentHash?.slice(0, 32)
        }...`,
        `Sig Hash: ${
          cert.signature?.dataHash
            ?.slice(0, 32)
        }...`,
      ]

      let cy = y - 11
      for (const line of certLines) {
        page.drawText(line, {
          x: margin + 8,
          y: cy,
          size: 7,
          font: regular,
          color: lightGray,
        })
        cy -= 10
      }

      y -= boxH + 14
    }

    y -= 20
  }

  // ESIGN/UETA compliance footer
  const footer
    = 'This document was signed electronically '
    + 'in compliance with the Electronic '
    + 'Signatures in Global and National '
    + 'Commerce Act (ESIGN, 15 U.S.C. \u00A77001 '
    + 'et seq.) and the Uniform Electronic '
    + 'Transactions Act (UETA).'

  const lastPage = doc.getPages().at(-1)!
  const footerLines = wrapText(
    footer, regular, 7, contentW,
  )
  let fy = margin + 5
  for (const line of footerLines.reverse()) {
    lastPage.drawText(line, {
      x: margin,
      y: fy,
      size: 7,
      font: regular,
      color: lightGray,
    })
    fy += 9
  }

  doc.setSubject('Electronically Signed Document')
  doc.setCreator('YourTrustedPlanner.com')
  doc.setProducer('pdf-lib')
  doc.setModificationDate(new Date())

  return doc.save()
}

/**
 * Stamp field values onto the unsigned PDF at
 * their placed coordinates, then append
 * signature page(s). Used when field placements
 * exist.
 */
export async function stampFieldsAndSign(
  existingPdfBytes: Uint8Array | ArrayBuffer,
  fieldPlacements: FieldPlacement[],
  sessions: SignerSession[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(
    existingPdfBytes,
  )
  const regular = await doc.embedFont(
    StandardFonts.Helvetica,
  )
  const bold = await doc.embedFont(
    StandardFonts.HelveticaBold,
  )
  const italic = await doc.embedFont(
    StandardFonts.HelveticaOblique,
  )
  const pdfPages = doc.getPages()

  const black = rgb(0, 0, 0)
  const gray = rgb(0.4, 0.4, 0.4)
  const lightGray = rgb(0.6, 0.6, 0.6)
  const brand = rgb(0.04, 0.15, 0.25)
  const pageW = 612
  const pageH = 792
  const margin = 50
  const contentW = pageW - margin * 2

  // Build fieldId → value map from sessions
  const fieldValueMap: Record<string, string> = {}
  const sessionByRole: Record<
    string, SignerSession
  > = {}

  for (const session of sessions) {
    sessionByRole[String(
      session.signerRole ?? 1,
    )] = session

    const vals = session.fieldValues
      ? typeof session.fieldValues === 'string'
        ? JSON.parse(session.fieldValues)
        : session.fieldValues
      : {}

    Object.entries(vals).forEach(
      ([fieldId, value]) => {
        fieldValueMap[fieldId] = String(value)
      },
    )
  }

  // Stamp each placed field
  for (const field of fieldPlacements) {
    const pageIndex = (field.page ?? 1) - 1
    if (
      pageIndex < 0
      || pageIndex >= pdfPages.length
    ) continue

    const page = pdfPages[pageIndex]
    const value = fieldValueMap[field.id]
    const session
      = sessionByRole[String(field.signerRole)]

    if (
      field.type === 'signature'
      || field.type === 'initials'
    ) {
      // Use the session's signature data
      const sigData
        = session?.signatureData
      if (!sigData) continue
      try {
        const base64 = sigData.replace(
          /^data:image\/png;base64,/, '',
        )
        const sigBytes = Uint8Array.from(
          atob(base64),
          c => c.charCodeAt(0),
        )
        const sigImage = await doc.embedPng(
          sigBytes,
        )
        const dims = sigImage.scaleToFit(
          field.width,
          field.height,
        )
        page.drawImage(sigImage, {
          x: field.x,
          y: field.y - dims.height,
          width: dims.width,
          height: dims.height,
        })
      }
      catch (err) {
        console.error(
          `Failed to stamp ${field.type}:`,
          err,
        )
      }
    }

    else if (field.type === 'date_signed') {
      const dateStr = session?.signedAt
        ? new Date(session.signedAt)
          .toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : new Date().toLocaleDateString(
          'en-US',
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          },
        )
      page.drawText(dateStr, {
        x: field.x,
        y: field.y - 12,
        size: 10,
        font: regular,
        color: black,
      })
    }

    else if (field.type === 'date') {
      if (!value) continue
      page.drawText(String(value), {
        x: field.x,
        y: field.y - 12,
        size: 10,
        font: regular,
        color: black,
      })
    }

    else if (field.type === 'name') {
      const name = session?.signerName ?? ''
      page.drawText(name, {
        x: field.x,
        y: field.y - 12,
        size: 10,
        font: regular,
        color: black,
      })
    }

    else if (field.type === 'text') {
      if (!value) continue
      page.drawText(String(value), {
        x: field.x,
        y: field.y - 12,
        size: 10,
        font: regular,
        color: black,
      })
    }

    else if (field.type === 'checkbox') {
      if (value) {
        page.drawText('X', {
          x: field.x + 2,
          y: field.y - 12,
          size: 12,
          font: bold,
          color: black,
        })
      }
    }
  }

  // Append signature page with all signers
  const sorted = [...sessions].sort(
    (a, b) => (a.signerRole ?? 1)
      - (b.signerRole ?? 1),
  )

  let sigPage = doc.addPage([pageW, pageH])
  let y = pageH - margin

  sigPage.drawText(
    'ELECTRONIC SIGNATURES', {
      x: margin,
      y,
      size: 14,
      font: bold,
      color: brand,
    },
  )
  y -= 20
  sigPage.drawLine({
    start: { x: margin, y },
    end: { x: pageW - margin, y },
    thickness: 0.75,
    color: brand,
  })
  y -= 24

  for (const session of sorted) {
    if (y < margin + 200) {
      sigPage = doc.addPage([pageW, pageH])
      y = pageH - margin
    }

    if (session.signatureData) {
      try {
        const base64 = session.signatureData
          .replace(
            /^data:image\/png;base64,/, '',
          )
        const sigBytes = Uint8Array.from(
          atob(base64),
          c => c.charCodeAt(0),
        )
        const sigImage = await doc.embedPng(
          sigBytes,
        )
        const dims = sigImage.scaleToFit(
          300, 100,
        )
        sigPage.drawImage(sigImage, {
          x: margin,
          y: y - dims.height,
          width: dims.width,
          height: dims.height,
        })
        y -= dims.height + 10
      }
      catch (err) {
        console.error(
          'Failed to embed sig:', err,
        )
        sigPage.drawText(
          '[Signature on file]', {
            x: margin,
            y,
            size: 9,
            font: italic,
            color: gray,
          },
        )
        y -= 14
      }
    }

    sigPage.drawLine({
      start: { x: margin, y },
      end: { x: margin + 250, y },
      thickness: 0.5,
      color: black,
    })
    y -= 15

    sigPage.drawText(session.signerName, {
      x: margin,
      y,
      size: 10,
      font: bold,
      color: black,
    })
    y -= 13

    sigPage.drawText(session.signerEmail, {
      x: margin,
      y,
      size: 8,
      font: regular,
      color: gray,
    })
    y -= 11

    const signedDate = new Date(
      session.signedAt,
    ).toLocaleString('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Denver',
    })
    sigPage.drawText(
      `Signed: ${signedDate}`, {
        x: margin,
        y,
        size: 8,
        font: regular,
        color: gray,
      },
    )
    y -= 16

    // Certificate box
    const cert
      = typeof session.signatureCertificate
        === 'string'
        ? JSON.parse(
          session.signatureCertificate as string,
        )
        : session.signatureCertificate

    if (cert) {
      const boxH = 44
      sigPage.drawRectangle({
        x: margin,
        y: y - boxH,
        width: contentW,
        height: boxH,
        color: rgb(0.96, 0.96, 0.96),
      })

      const certLines = [
        `Certificate: ${cert.certificateId}`,
        `Doc Hash: ${
          cert.documentHash?.slice(0, 32)
        }...`,
        `Sig Hash: ${
          cert.signature?.dataHash
            ?.slice(0, 32)
        }...`,
      ]

      let cy = y - 11
      for (const line of certLines) {
        sigPage.drawText(line, {
          x: margin + 8,
          y: cy,
          size: 7,
          font: regular,
          color: lightGray,
        })
        cy -= 10
      }

      y -= boxH + 14
    }

    y -= 20
  }

  // Compliance footer
  const footer
    = 'This document was signed electronically '
    + 'in compliance with the Electronic '
    + 'Signatures in Global and National '
    + 'Commerce Act (ESIGN, 15 U.S.C. '
    + '\u00A77001 et seq.) and the Uniform '
    + 'Electronic Transactions Act (UETA).'

  const lastPage = doc.getPages().at(-1)!
  const footerLines = wrapText(
    footer, regular, 7, contentW,
  )
  let fy = margin + 5
  for (const line of footerLines.reverse()) {
    lastPage.drawText(line, {
      x: margin,
      y: fy,
      size: 7,
      font: regular,
      color: lightGray,
    })
    fy += 9
  }

  doc.setSubject('Electronically Signed Document')
  doc.setCreator('YourTrustedPlanner.com')
  doc.setProducer('pdf-lib')
  doc.setModificationDate(new Date())

  return doc.save()
}
