<template>
  <div class="rich-text-editor">
    <label
      v-if="label"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
    </label>

    <!-- Mode Toggle -->
    <div class="flex items-center justify-between border border-b-0 border-gray-300 rounded-t-lg px-2 py-1.5 bg-gray-50">
      <!-- Toolbar (WYSIWYG mode) -->
      <div
        v-if="!sourceMode && editor"
        class="flex flex-wrap gap-0.5"
      >
        <button
          v-for="btn in toolbarButtons"
          :key="btn.action"
          type="button"
          class="p-1.5 rounded hover:bg-gray-200 transition-colors"
          :class="btn.isActive?.() ? 'bg-gray-200 text-accent-700' : 'text-gray-600'"
          :title="btn.title"
          @click="btn.command()"
        >
          <component
            :is="btn.icon"
            class="w-4 h-4"
          />
        </button>
      </div>
      <div
        v-else
        class="text-xs text-gray-500"
      >
        HTML Source
      </div>

      <!-- Source Toggle -->
      <button
        type="button"
        class="px-2 py-1 text-xs font-medium rounded transition-colors"
        :class="sourceMode ? 'bg-accent-100 text-accent-700' : 'text-gray-500 hover:bg-gray-200'"
        @click="toggleSource"
      >
        {{ sourceMode ? 'Visual' : '&lt;/&gt; Source' }}
      </button>
    </div>

    <!-- WYSIWYG Editor -->
    <div v-show="!sourceMode">
      <EditorContent
        :editor="editor"
        class="border border-gray-300 rounded-b-lg prose prose-sm max-w-none focus-within:border-accent-400 focus-within:ring-1 focus-within:ring-accent-400"
      />
    </div>

    <!-- Source Editor -->
    <div v-show="sourceMode">
      <textarea
        ref="sourceTextarea"
        :value="sourceHtml"
        class="w-full border border-gray-300 rounded-b-lg px-4 py-3 font-mono text-sm text-gray-800 bg-gray-50 focus:border-accent-400 focus:ring-1 focus:ring-accent-400 focus:outline-none"
        :rows="12"
        spellcheck="false"
        @input="onSourceInput"
      />
    </div>

    <p
      v-if="hint"
      class="mt-1 text-xs text-gray-500"
    >
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Youtube from '@tiptap/extension-youtube'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Link as LinkIcon, Heading1, Heading2,
  Undo, Redo, RemoveFormatting, Minus, Youtube as YoutubeIcon,
  Palette, Highlighter
} from 'lucide-vue-next'
import { sanitizeHtml } from '~/utils/html-sanitize'

const props = withDefaults(defineProps<{
  modelValue?: string
  label?: string
  hint?: string
}>(), {
  modelValue: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const sourceMode = ref(false)
const sourceHtml = ref('')
const sourceTextarea = ref<HTMLTextAreaElement | null>(null)

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      horizontalRule: {}
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'text-accent-600 underline' }
    }),
    Youtube.configure({
      inline: false,
      HTMLAttributes: { class: 'rounded-lg overflow-hidden' }
    }),
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true
    })
  ],
  editorProps: {
    attributes: {
      class: 'px-4 py-3 min-h-[150px] max-h-[400px] overflow-y-auto focus:outline-none'
    }
  },
  onUpdate: ({ editor: e }) => {
    if (!sourceMode.value) {
      emit('update:modelValue', e.getHTML())
    }
  }
})

// Sync external changes
watch(() => props.modelValue, (val) => {
  if (editor.value && !sourceMode.value && editor.value.getHTML() !== val) {
    editor.value.commands.setContent(val || '')
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// ── Source Mode ──────────────────────────────────────────────────────────────

function toggleSource() {
  if (sourceMode.value) {
    // Switching from source to WYSIWYG — sanitize and apply
    const clean = sanitizeHtml(sourceHtml.value)
    editor.value?.commands.setContent(clean)
    emit('update:modelValue', clean)
    sourceMode.value = false
  } else {
    // Switching from WYSIWYG to source
    sourceHtml.value = editor.value?.getHTML() || ''
    sourceMode.value = true
    nextTick(() => sourceTextarea.value?.focus())
  }
}

function onSourceInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value
  sourceHtml.value = val
  // Emit sanitized HTML on each input
  emit('update:modelValue', sanitizeHtml(val))
}

// ── Toolbar Actions ─────────────────────────────────────────────────────────

function setLink() {
  if (!editor.value) return
  const previousUrl = editor.value.getAttributes('link').href
  const url = window.prompt('URL', previousUrl)
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
  } else {
    editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
}

function addYoutube() {
  if (!editor.value) return
  const url = window.prompt('YouTube URL')
  if (!url) return
  editor.value.commands.setYoutubeVideo({ src: url, width: 640, height: 360 })
}

function setTextColor() {
  if (!editor.value) return
  const color = window.prompt('Text color (hex)', '#2d7a8f')
  if (!color) return
  editor.value.chain().focus().setColor(color).run()
}

function setHighlight() {
  if (!editor.value) return
  const color = window.prompt('Highlight color (hex)', '#f0f8f9')
  if (!color) return
  editor.value.chain().focus().setHighlight({ color }).run()
}

const toolbarButtons = computed(() => {
  if (!editor.value) return []
  const e = editor.value
  return [
    { action: 'bold', title: 'Bold', icon: Bold, isActive: () => e.isActive('bold'), command: () => e.chain().focus().toggleBold().run() },
    { action: 'italic', title: 'Italic', icon: Italic, isActive: () => e.isActive('italic'), command: () => e.chain().focus().toggleItalic().run() },
    { action: 'underline', title: 'Underline', icon: UnderlineIcon, isActive: () => e.isActive('underline'), command: () => e.chain().focus().toggleUnderline().run() },
    { action: 'strike', title: 'Strikethrough', icon: Strikethrough, isActive: () => e.isActive('strike'), command: () => e.chain().focus().toggleStrike().run() },
    { action: 'color', title: 'Text Color', icon: Palette, command: () => setTextColor() },
    { action: 'highlight', title: 'Highlight', icon: Highlighter, isActive: () => e.isActive('highlight'), command: () => setHighlight() },
    { action: 'h1', title: 'Heading 1', icon: Heading1, isActive: () => e.isActive('heading', { level: 1 }), command: () => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { action: 'h2', title: 'Heading 2', icon: Heading2, isActive: () => e.isActive('heading', { level: 2 }), command: () => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { action: 'bulletList', title: 'Bullet List', icon: List, isActive: () => e.isActive('bulletList'), command: () => e.chain().focus().toggleBulletList().run() },
    { action: 'orderedList', title: 'Numbered List', icon: ListOrdered, isActive: () => e.isActive('orderedList'), command: () => e.chain().focus().toggleOrderedList().run() },
    { action: 'hr', title: 'Horizontal Rule', icon: Minus, command: () => e.chain().focus().setHorizontalRule().run() },
    { action: 'link', title: 'Link', icon: LinkIcon, isActive: () => e.isActive('link'), command: () => setLink() },
    { action: 'youtube', title: 'YouTube Video', icon: YoutubeIcon, command: () => addYoutube() },
    { action: 'clearFormat', title: 'Clear Formatting', icon: RemoveFormatting, command: () => e.chain().focus().clearNodes().unsetAllMarks().run() },
    { action: 'undo', title: 'Undo', icon: Undo, command: () => e.chain().focus().undo().run() },
    { action: 'redo', title: 'Redo', icon: Redo, command: () => e.chain().focus().redo().run() }
  ]
})
</script>
