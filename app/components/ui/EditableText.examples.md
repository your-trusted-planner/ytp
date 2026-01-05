# EditableText Component - Usage Guide

A reusable Vue component for inline text editing with customizable cursors, validation, and transformations.

## Features

- ✅ **Click to edit** - Click on text to start editing
- ✅ **Custom cursors** - Use any custom cursor from the `createCursor` utility
- ✅ **Keyboard shortcuts** - Enter to save, Escape to cancel
- ✅ **Auto-save on blur** - Optionally save when clicking away
- ✅ **Validation** - Built-in validation support
- ✅ **Transformation** - Transform values before saving (trim, uppercase, etc.)
- ✅ **Flexible tags** - Render as span, div, h1-h6, or p
- ✅ **Custom styling** - Full control over display and input styles
- ✅ **TypeScript support** - Fully typed with interfaces

---

## Basic Usage

### Simple Text Editing

```vue
<script setup>
const name = ref('John Doe')
</script>

<template>
  <UiEditableText v-model="name" />
</template>
```

### As a Heading

```vue
<script setup>
const title = ref('My Journey')
</script>

<template>
  <UiEditableText
    v-model="title"
    tag="h1"
    display-class="text-3xl font-bold text-gray-900"
    input-class="text-3xl font-bold"
  />
</template>
```

### With Custom Cursor

```vue
<script setup>
import { createPencilCursor } from '~/utils/createCursor'

const journeyName = ref('Estate Planning Journey')
const pencilCursor = createPencilCursor({ color: '#991b1b', size: 20 })
</script>

<template>
  <UiEditableText
    v-model="journeyName"
    tag="h3"
    display-class="text-lg font-semibold"
    :custom-cursor="pencilCursor"
  />
</template>
```

---

## Advanced Usage

### With Validation

```vue
<script setup>
const email = ref('user@example.com')

function validateEmail(value: string | number): string | null {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(value.toString())) {
    return 'Invalid email format'
  }
  return null
}
</script>

<template>
  <UiEditableText
    v-model="email"
    type="email"
    :validate="validateEmail"
    placeholder="Enter email..."
  />
</template>
```

### With Transformation

```vue
<script setup>
const username = ref('john_doe')

// Automatically trim and lowercase
const transform = (value: string | number) => {
  return value.toString().trim().toLowerCase()
}
</script>

<template>
  <UiEditableText
    v-model="username"
    :transform="transform"
    placeholder="Enter username..."
  />
</template>
```

### With Events

```vue
<script setup>
const title = ref('My Title')

function handleSave(newValue: string | number) {
  console.log('Saved:', newValue)
  // Make API call, show toast, etc.
}

function handleEditStart() {
  console.log('Started editing')
}

function handleEditEnd() {
  console.log('Finished editing')
}
</script>

<template>
  <UiEditableText
    v-model="title"
    @save="handleSave"
    @edit-start="handleEditStart"
    @edit-end="handleEditEnd"
  />
</template>
```

### Disabled State

```vue
<script setup>
const readOnlyText = ref('Cannot edit this')
</script>

<template>
  <UiEditableText
    v-model="readOnlyText"
    :disabled="true"
  />
</template>
```

### Manual Save (No Auto-save)

```vue
<template>
  <UiEditableText
    v-model="text"
    :auto-save="false"
  />
</template>
```

Note: With `auto-save="false"`, only pressing Enter will save. Clicking away (blur) will cancel.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string \| number` | Required | The value to display and edit (v-model) |
| `tag` | `'span' \| 'div' \| 'h1'...'h6' \| 'p'` | `'span'` | HTML tag for display mode |
| `type` | `'text' \| 'email' \| 'url' \| 'tel' \| 'number'` | `'text'` | Input type |
| `placeholder` | `string` | - | Placeholder text when empty |
| `displayClass` | `string` | `''` | Custom classes for display mode |
| `inputClass` | `string` | `''` | Custom classes for input mode |
| `customCursor` | `string` | - | Custom cursor CSS (use `createCursor` utility) |
| `disabled` | `boolean` | `false` | Disable editing |
| `autoSave` | `boolean` | `true` | Auto-save on blur |
| `validate` | `(value) => string \| null` | - | Validation function (return error message or null) |
| `transform` | `(value) => string \| number` | - | Transform value before saving |
| `emptyPlaceholder` | `string` | `'(empty)'` | Text shown when value is empty |

---

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string \| number` | Emitted when value changes (v-model) |
| `save` | `string \| number` | Emitted when value is saved |
| `cancel` | - | Emitted when editing is cancelled |
| `edit-start` | - | Emitted when editing begins |
| `edit-end` | - | Emitted when editing ends (save or cancel) |

---

## Slots

### `display` Slot

Customize how the value is displayed:

```vue
<UiEditableText v-model="username">
  <template #display="{ value }">
    <span class="font-mono">@{{ value }}</span>
  </template>
</UiEditableText>
```

---

## Exposed Methods

Access component methods using template refs:

```vue
<script setup>
const editableRef = ref(null)

function startEditing() {
  editableRef.value?.startEditing()
}

function saveChanges() {
  editableRef.value?.save()
}
</script>

<template>
  <UiEditableText ref="editableRef" v-model="text" />
  <button @click="startEditing">Edit Programmatically</button>
</template>
```

Available methods:
- `startEditing()` - Enter edit mode
- `save()` - Save current changes
- `cancel()` - Cancel editing
- `isEditing` - Reactive ref for edit state

---

## Real-World Examples

### Editable Journey Name (Current Implementation)

```vue
<script setup>
import { createSquarePenCursor } from '~/utils/createCursor'

const journey = ref({
  id: '123',
  name: 'Estate Planning Journey'
})

const pencilCursor = createSquarePenCursor({
  color: '#991b1b',
  size: 20
})

async function saveJourneyName(journey, newName) {
  await $fetch(`/api/journeys/${journey.id}`, {
    method: 'PUT',
    body: { name: newName }
  })
}
</script>

<template>
  <UiEditableText
    v-model="journey.name"
    tag="h3"
    display-class="text-lg font-semibold text-gray-900 mb-1"
    input-class="text-lg font-semibold"
    :custom-cursor="pencilCursor"
    :transform="(v) => v.toString().trim()"
    @save="saveJourneyName(journey, $event)"
  />
</template>
```

### Editable Table Cell

```vue
<script setup>
import { createPencilCursor } from '~/utils/createCursor'

const items = ref([
  { id: 1, name: 'Item 1', price: 100 },
  { id: 2, name: 'Item 2', price: 200 }
])

const editCursor = createPencilCursor({ color: '#3b82f6' })

async function updateItem(item, field, value) {
  await $fetch(`/api/items/${item.id}`, {
    method: 'PATCH',
    body: { [field]: value }
  })
}
</script>

<template>
  <table>
    <tbody>
      <tr v-for="item in items" :key="item.id">
        <td>
          <UiEditableText
            v-model="item.name"
            :custom-cursor="editCursor"
            @save="updateItem(item, 'name', $event)"
          />
        </td>
        <td>
          <UiEditableText
            v-model="item.price"
            type="number"
            :custom-cursor="editCursor"
            @save="updateItem(item, 'price', $event)"
          />
        </td>
      </tr>
    </tbody>
  </table>
</template>
```

### Editable Card Title

```vue
<script setup>
import { createSquarePenCursor } from '~/utils/createCursor'

const card = ref({
  title: 'My Card Title',
  description: 'Card description...'
})

const editCursor = createSquarePenCursor({ color: '#059669' })
</script>

<template>
  <div class="card">
    <UiEditableText
      v-model="card.title"
      tag="h2"
      display-class="text-2xl font-bold mb-2"
      input-class="text-2xl font-bold"
      :custom-cursor="editCursor"
      @save="saveCard"
    />
    <p>{{ card.description }}</p>
  </div>
</template>
```

---

## Styling Tips

### Match Your Design System

```vue
<!-- Tailwind classes -->
<UiEditableText
  v-model="text"
  display-class="text-lg font-semibold text-blue-600 hover:text-blue-800"
  input-class="text-lg font-semibold border-blue-500"
/>
```

### Override Default Styles

The component includes default styles that can be overridden:

```vue
<UiEditableText
  v-model="text"
  display-class="my-custom-display-class"
  input-class="my-custom-input-class"
/>

<style scoped>
.my-custom-display-class:hover {
  color: #10b981;
  text-decoration: underline;
}

.my-custom-input-class {
  border: 2px solid #10b981;
  background: #f0fdf4;
}
</style>
```

---

## Best Practices

1. **Always provide a transform** for text inputs to handle whitespace:
   ```ts
   :transform="(v) => v.toString().trim()"
   ```

2. **Use appropriate input types** for better mobile keyboards:
   ```vue
   <UiEditableText type="email" ... />
   <UiEditableText type="tel" ... />
   <UiEditableText type="number" ... />
   ```

3. **Add validation** for critical fields:
   ```ts
   const validate = (v) => v.length > 0 ? null : 'Required field'
   ```

4. **Handle API errors** in the `@save` handler:
   ```ts
   async function handleSave(newValue) {
     try {
       await saveToAPI(newValue)
     } catch (error) {
       // Show error toast, revert value, etc.
     }
   }
   ```

5. **Use meaningful empty placeholders**:
   ```vue
   <UiEditableText
     v-model="optionalField"
     empty-placeholder="Click to add..."
   />
   ```

---

## Accessibility

The component automatically includes:
- Focus management (auto-focus on edit)
- Keyboard shortcuts (Enter/Escape)
- Visual feedback (hover states, focus rings)

For better accessibility, consider:
- Adding `aria-label` attributes for context
- Providing clear visual indicators for editable fields
- Testing with keyboard-only navigation
