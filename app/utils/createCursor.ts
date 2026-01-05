/**
 * Utility for creating custom CSS cursors from SVG icons
 * Works with Lucide, Heroicons, and any SVG-based icon library
 */

interface CursorOptions {
  /** Icon size in pixels (default: 20) */
  size?: number
  /** Stroke color (hex or named color, default: 'currentColor') */
  color?: string
  /** Stroke width (default: 2) */
  strokeWidth?: number
  /** Fill color (default: 'none') */
  fill?: string
  /** Hotspot X coordinate - where click registers (default: center) */
  hotspotX?: number
  /** Hotspot Y coordinate - where click registers (default: center) */
  hotspotY?: number
  /** Fallback cursor (default: 'pointer') */
  fallback?: string
}

interface LucideIconData {
  /** SVG path data (the "d" attribute content) */
  paths: string[]
  /** Original viewBox (usually "0 0 24 24" for Lucide) */
  viewBox?: string
}

/**
 * Creates a custom cursor from SVG path data (Lucide-style)
 *
 * @example
 * ```ts
 * const pencilCursor = createCursorFromPaths({
 *   paths: [
 *     'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
 *     'm15 5 4 4'
 *   ],
 *   color: '#991b1b',
 *   size: 20
 * })
 * ```
 */
export function createCursorFromPaths(
  iconData: LucideIconData,
  options: CursorOptions = {}
): string {
  const {
    size = 20,
    color = 'currentColor',
    strokeWidth = 2,
    fill = 'none',
    hotspotX,
    hotspotY,
    fallback = 'pointer',
    viewBox = iconData.viewBox || '0 0 24 24'
  } = options

  // Build SVG from paths
  const pathElements = iconData.paths
    .map(path => `<path d='${path}'/>`)
    .join('')

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='${viewBox}' fill='${fill}' stroke='${encodeColor(color)}' stroke-width='${strokeWidth}' stroke-linecap='round' stroke-linejoin='round'>${pathElements}</svg>`

  return buildCursorCSS(svg, hotspotX || size / 2, hotspotY || size / 2, fallback)
}

/**
 * Creates a custom cursor from full SVG markup
 *
 * @example
 * ```ts
 * const customCursor = createCursorFromSVG(`
 *   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
 *     <circle cx="12" cy="12" r="10" fill="red"/>
 *   </svg>
 * `)
 * ```
 */
export function createCursorFromSVG(
  svgMarkup: string,
  options: Partial<CursorOptions> = {}
): string {
  const {
    size = 20,
    color,
    hotspotX,
    hotspotY,
    fallback = 'pointer'
  } = options

  let processedSVG = svgMarkup.trim()

  // Set size if not already specified in SVG
  if (!processedSVG.includes('width=')) {
    processedSVG = processedSVG.replace('<svg', `<svg width='${size}' height='${size}'`)
  }

  // Replace color if specified
  if (color) {
    processedSVG = processedSVG
      .replace(/stroke="[^"]*"/g, `stroke='${encodeColor(color)}'`)
      .replace(/fill="[^"]*"/g, `fill='${encodeColor(color)}'`)
  }

  return buildCursorCSS(processedSVG, hotspotX || size / 2, hotspotY || size / 2, fallback)
}

/**
 * Helper: Encode color for URL usage
 */
function encodeColor(color: string): string {
  if (color.startsWith('#')) {
    return color.replace('#', '%23')
  }
  return color
}

/**
 * Helper: Build final CSS cursor string
 */
function buildCursorCSS(
  svg: string,
  hotspotX: number,
  hotspotY: number,
  fallback: string
): string {
  // URL-encode the SVG
  const encoded = svg
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/'/g, '%27') // Encode quotes
    .replace(/"/g, '%22')
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')

  return `url("data:image/svg+xml,${encoded}") ${Math.round(hotspotX)} ${Math.round(hotspotY)}, ${fallback}`
}

/**
 * Pre-built Lucide icon cursor creators
 * These are convenience functions for commonly used edit/interaction icons
 */

/** Pencil cursor (standard edit icon) */
export function createPencilCursor(options: CursorOptions = {}) {
  return createCursorFromPaths({
    paths: [
      'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
      'm15 5 4 4'
    ]
  }, {
    hotspotX: 2,
    hotspotY: 18, // Positioned at pencil tip
    ...options
  })
}

/** Square pen cursor (modern edit icon) */
export function createSquarePenCursor(options: CursorOptions = {}) {
  return createCursorFromPaths({
    paths: [
      'M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7',
      'M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z'
    ]
  }, {
    hotspotX: 18,
    hotspotY: 2, // Positioned at pen tip
    ...options
  })
}

/** Move/grab cursor */
export function createMoveCursor(options: CursorOptions = {}) {
  return createCursorFromPaths({
    paths: [
      'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20'
    ]
  }, options)
}

/** Plus/add cursor */
export function createPlusCursor(options: CursorOptions = {}) {
  return createCursorFromPaths({
    paths: [
      'M5 12h14',
      'M12 5v14'
    ]
  }, options)
}

/** Trash/delete cursor */
export function createTrashCursor(options: CursorOptions = {}) {
  return createCursorFromPaths({
    paths: [
      'M3 6h18',
      'm19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
      'M10 11v6',
      'M14 11v6'
    ]
  }, {
    hotspotX: 12,
    hotspotY: 6, // Top center
    ...options
  })
}

/**
 * Composable for reactive cursor creation
 * Useful when cursor needs to change based on state
 */
export function useCursor() {
  return {
    pencil: (color?: string) => createPencilCursor({ color }),
    squarePen: (color?: string) => createSquarePenCursor({ color }),
    move: (color?: string) => createMoveCursor({ color }),
    plus: (color?: string) => createPlusCursor({ color }),
    trash: (color?: string) => createTrashCursor({ color }),
    fromPaths: createCursorFromPaths,
    fromSVG: createCursorFromSVG
  }
}

/**
 * Vue composable for cursor styles
 * Returns reactive cursor style object
 *
 * @example
 * ```vue
 * <script setup>
 * const { cursorStyle } = useCursorStyle(() => createPencilCursor({ color: '#991b1b' }))
 * </script>
 * <template>
 *   <div :style="cursorStyle">Hover me</div>
 * </template>
 * ```
 */
export function useCursorStyle(cursorFactory: () => string) {
  const cursorStyle = computed(() => ({
    cursor: cursorFactory()
  }))

  return { cursorStyle }
}
