# Custom Cursor Utility - Usage Guide

This utility allows you to create custom CSS cursors from any SVG-based icon library, including Lucide, Heroicons, Font Awesome, and more.

## Quick Start

### Pre-built Cursors (Lucide Icons)

The easiest way to use custom cursors is with the pre-built functions:

```vue
<script setup>
import { createPencilCursor, createSquarePenCursor, createMoveCursor } from '~/utils/createCursor'

// Create cursors with default settings
const pencilCursor = createPencilCursor()
const squarePenCursor = createSquarePenCursor({ color: '#991b1b' })
const moveCursor = createMoveCursor({ size: 24, color: '#059669' })
</script>

<style scoped>
.editable {
  cursor: v-bind(pencilCursor);
}

.draggable {
  cursor: v-bind(moveCursor);
}
</style>
```

### Available Pre-built Cursors

- `createPencilCursor()` - Standard edit icon
- `createSquarePenCursor()` - Modern edit icon
- `createMoveCursor()` - Four-way move/drag icon
- `createPlusCursor()` - Add/create icon
- `createTrashCursor()` - Delete icon

All accept an optional `CursorOptions` object.

---

## Advanced Usage

### 1. Create Cursor from Lucide Icon Paths

```ts
import { createCursorFromPaths } from '~/utils/createCursor'

const myCursor = createCursorFromPaths({
  paths: [
    'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    'M9 22V12h6v10'
  ],
  viewBox: '0 0 24 24'  // Optional, defaults to "0 0 24 24"
}, {
  size: 24,
  color: '#3b82f6',
  strokeWidth: 2,
  hotspotX: 12,  // Where the click registers (X)
  hotspotY: 12,  // Where the click registers (Y)
  fallback: 'pointer'  // CSS fallback cursor
})
```

### 2. Create Cursor from Full SVG Markup

Works with **any SVG**, including Heroicons, Font Awesome, custom SVGs, etc:

```ts
import { createCursorFromSVG } from '~/utils/createCursor'

// Heroicons example
const heroIconCursor = createCursorFromSVG(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"/>
  </svg>
`, {
  size: 20,
  color: '#dc2626'
})

// Font Awesome example (if using SVG version)
const faCursor = createCursorFromSVG(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <path fill="currentColor" d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160V416c0 53 43 96 96 96H352c53 0 96-43 96-96V320c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H96z"/>
  </svg>
`, { size: 20 })
```

### 3. Using the Composable

For reactive cursors or when you need multiple cursor utilities:

```vue
<script setup>
import { useCursor } from '~/utils/createCursor'

const cursor = useCursor()

// Use pre-built cursors
const editCursor = cursor.pencil('#991b1b')
const deleteCursor = cursor.trash('#dc2626')

// Or create custom cursors
const customCursor = cursor.fromPaths({
  paths: ['M12 2L2 7l10 5 10-5-10-5z'],
  viewBox: '0 0 24 24'
}, {
  color: '#059669',
  size: 22
})
</script>
```

---

## Configuration Options

All cursor creation functions accept a `CursorOptions` object:

```ts
interface CursorOptions {
  /** Icon size in pixels (default: 20) */
  size?: number

  /** Stroke color - hex or named color (default: 'currentColor') */
  color?: string

  /** Stroke width (default: 2) */
  strokeWidth?: number

  /** Fill color (default: 'none') */
  fill?: string

  /** Hotspot X - where click registers (default: center) */
  hotspotX?: number

  /** Hotspot Y - where click registers (default: center) */
  hotspotY?: number

  /** Fallback cursor (default: 'pointer') */
  fallback?: string
}
```

### Hotspot Positioning

The hotspot determines where clicks register on the cursor:

```ts
// Pencil at tip
createPencilCursor({ hotspotX: 2, hotspotY: 18 })

// Centered (for symmetric icons)
createMoveCursor({ hotspotX: 12, hotspotY: 12 })

// Top-left corner
createPlusCursor({ hotspotX: 0, hotspotY: 0 })
```

---

## Real-World Examples

### Inline Editable Text

```vue
<script setup>
import { createPencilCursor } from '~/utils/createCursor'

const editCursor = createPencilCursor({
  color: '#991b1b',
  size: 20
})
</script>

<template>
  <h1 class="editable-title" @click="startEditing">
    {{ title }}
  </h1>
</template>

<style scoped>
.editable-title {
  cursor: v-bind(editCursor);
}
.editable-title:hover {
  color: #991b1b;
}
</style>
```

### Draggable Cards

```vue
<script setup>
import { createMoveCursor } from '~/utils/createCursor'

const dragCursor = createMoveCursor({
  color: '#059669',
  size: 24
})
</script>

<template>
  <div class="card" draggable="true">
    <div class="drag-handle">⋮⋮</div>
    Card Content
  </div>
</template>

<style scoped>
.drag-handle {
  cursor: v-bind(dragCursor);
}
</style>
```

### Delete Zone

```vue
<script setup>
import { createTrashCursor } from '~/utils/createCursor'

const deleteCursor = createTrashCursor({
  color: '#dc2626',
  size: 20
})
</script>

<template>
  <div class="delete-zone" @click="handleDelete">
    Drop here to delete
  </div>
</template>

<style scoped>
.delete-zone {
  cursor: v-bind(deleteCursor);
  background: #fee2e2;
}
</style>
```

---

## Finding Icon Paths

### Lucide Icons

1. Visit [lucide.dev](https://lucide.dev)
2. Search for an icon
3. Click "Copy SVG"
4. Extract the `<path d="...">` content

Example (Lucide "Heart" icon):
```ts
createCursorFromPaths({
  paths: [
    'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'
  ]
})
```

### Heroicons

1. Visit [heroicons.com](https://heroicons.com)
2. Click an icon → "Copy SVG"
3. Use `createCursorFromSVG()` with the full SVG markup

### Font Awesome

1. Use Font Awesome's SVG version
2. Copy the SVG markup
3. Use `createCursorFromSVG()`

---

## Browser Compatibility

- ✅ **Chrome/Edge**: Full support
- ✅ **Firefox**: Full support
- ✅ **Safari**: Full support
- ⚠️ **Size limits**: Most browsers limit cursor images to 128x128px
- ⚠️ **File size**: Keep SVGs simple for better performance

---

## Tips & Best Practices

1. **Size**: Keep cursors between 16-24px for best visibility
2. **Color**: Use theme colors for consistency
3. **Hotspot**: Position at the "active" part of the icon (e.g., pencil tip, arrow point)
4. **Fallback**: Always provide a fallback cursor
5. **Performance**: Pre-create cursors outside components when possible
6. **Accessibility**: Ensure custom cursors don't confuse users (use familiar metaphors)

---

## Troubleshooting

**Cursor not showing?**
- Check browser console for SVG encoding errors
- Verify SVG syntax is valid
- Try reducing icon complexity

**Cursor appears too large/small?**
- Adjust the `size` option
- Remember browsers may have maximum size limits

**Hotspot not registering clicks correctly?**
- Adjust `hotspotX` and `hotspotY` values
- Use browser devtools to test click areas

**Color not applying?**
- Ensure color is properly encoded (utility handles this automatically)
- For filled icons, use `fill` instead of `color`
