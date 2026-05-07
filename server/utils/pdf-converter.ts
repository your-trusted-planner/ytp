// Convert a DOCX buffer to PDF via the external
// docx2pdf-service (shared with ohlaw on Render).

export const convertDocxToPdf = async (
  docxBuffer: ArrayBuffer | Uint8Array,
): Promise<Uint8Array> => {
  const config = useRuntimeConfig()
  const url = config.docxConverter?.url
  const key = config.docxConverter?.key

  if (!url) {
    throw new Error(
      'DOCX_CONVERTER_URL is not configured',
    )
  }

  const response = await fetch(
    `${url}/convert`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/octet-stream',
        ...(key
          ? { Authorization: `Bearer ${key}` }
          : {}),
      },
      body: docxBuffer,
    },
  )

  if (!response.ok) {
    const text = await response.text()
      .catch(() => '')
    throw new Error(
      `PDF conversion failed `
      + `(${response.status}): ${text}`,
    )
  }

  const arrayBuffer
    = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}
