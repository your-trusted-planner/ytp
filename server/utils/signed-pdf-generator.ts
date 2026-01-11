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
  text = text.replace(/&#39;/g, "'")

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
      } else {
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
  } catch (error) {
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
