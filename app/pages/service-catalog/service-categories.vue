<template>
  <div class="space-y-6">
    <!-- Back link -->
    <button
      @click="router.back()"
      class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
    >
      <ArrowLeft class="w-4 h-4 mr-1" />
      Back
    </button>

    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Service Categories</h1>
        <p class="text-gray-600 mt-1">Manage categories for organizing your service catalog</p>
      </div>
      <UiButton @click="openCreateModal">
        <Plus class="w-4 h-4 mr-2" />
        Add Category
      </UiButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <Loader class="w-8 h-8 animate-spin text-burgundy-600 mx-auto" />
      <p class="text-gray-500 mt-2">Loading categories...</p>
    </div>

    <!-- Empty State -->
    <UiCard v-else-if="categories.length === 0">
      <div class="text-center py-12">
        <FolderOpen class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
        <p class="text-gray-600 mb-4">Create your first service category to organize your catalog</p>
        <UiButton @click="openCreateModal">Add Category</UiButton>
      </div>
    </UiCard>

    <!-- Categories List -->
    <UiCard v-else>
      <template #header>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Categories</h2>
            <p class="text-sm text-gray-600 mt-1">
              Drag to reorder. Categories appear in this order in dropdowns.
            </p>
          </div>
        </div>
      </template>

      <draggable
        v-model="categories"
        item-key="id"
        handle=".drag-handle"
        @end="handleReorder"
        class="divide-y divide-gray-200"
      >
        <template #item="{ element: category }">
          <div class="flex items-center justify-between py-4 px-2 hover:bg-gray-50 -mx-2">
            <div class="flex items-center space-x-4">
              <button class="drag-handle cursor-move text-gray-400 hover:text-gray-600">
                <GripVertical class="w-5 h-5" />
              </button>
              <div>
                <h3 class="font-medium text-gray-900">{{ category.name }}</h3>
                <p v-if="category.description" class="text-sm text-gray-500">{{ category.description }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <span class="text-sm text-gray-400">Order: {{ category.display_order }}</span>
              <button
                @click="editCategory(category)"
                class="text-burgundy-600 hover:text-burgundy-800 text-sm font-medium"
              >
                Edit
              </button>
              <button
                @click="confirmDelete(category)"
                class="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </template>
      </draggable>
    </UiCard>

    <!-- Create/Edit Modal -->
    <UiModal v-model="showEditModal" :title="editingCategory ? 'Edit Category' : 'Add Category'" size="md">
      <form @submit.prevent="handleSave" class="space-y-4">
        <UiInput
          v-model="form.name"
          label="Category Name"
          placeholder="e.g., Trust Formation"
          required
        />

        <UiTextarea
          v-model="form.description"
          label="Description (optional)"
          placeholder="Brief description of this category..."
          :rows="2"
        />
      </form>

      <template #footer>
        <UiButton variant="outline" @click="showEditModal = false">
          Cancel
        </UiButton>
        <UiButton @click="handleSave" :loading="saving">
          {{ editingCategory ? 'Save Changes' : 'Add Category' }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Delete Category" size="sm">
      <div class="space-y-4">
        <p class="text-gray-700">
          Are you sure you want to delete <strong>{{ deletingCategory?.name }}</strong>?
        </p>
        <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p class="text-sm text-yellow-800">
            <strong>Note:</strong> Services using this category will keep their current category value,
            but it won't appear in dropdowns for new services.
          </p>
        </div>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="showDeleteModal = false">
          Cancel
        </UiButton>
        <UiButton variant="danger" @click="handleDelete" :loading="deleting">
          Delete Category
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Plus, Loader, FolderOpen, GripVertical } from 'lucide-vue-next'
import draggable from 'vuedraggable'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const router = useRouter()

interface Category {
  id: string
  name: string
  description: string | null
  display_order: number
  is_active: number
}

const categories = ref<Category[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const editingCategory = ref<Category | null>(null)
const deletingCategory = ref<Category | null>(null)

const form = ref({
  name: '',
  description: ''
})

async function fetchCategories() {
  loading.value = true
  try {
    const { categories: data } = await $fetch<{ categories: Category[] }>('/api/service-categories')
    categories.value = data
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingCategory.value = null
  form.value = { name: '', description: '' }
  showEditModal.value = true
}

function editCategory(category: Category) {
  editingCategory.value = category
  form.value = {
    name: category.name,
    description: category.description || ''
  }
  showEditModal.value = true
}

async function handleSave() {
  if (!form.value.name.trim()) return

  saving.value = true
  try {
    if (editingCategory.value) {
      await $fetch(`/api/service-categories/${editingCategory.value.id}`, {
        method: 'PUT',
        body: form.value
      })
    } else {
      await $fetch('/api/service-categories', {
        method: 'POST',
        body: form.value
      })
    }
    showEditModal.value = false
    await fetchCategories()
  } catch (error: any) {
    console.error('Failed to save category:', error)
    alert(error.data?.message || 'Failed to save category')
  } finally {
    saving.value = false
  }
}

function confirmDelete(category: Category) {
  deletingCategory.value = category
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!deletingCategory.value) return

  deleting.value = true
  try {
    await $fetch(`/api/service-categories/${deletingCategory.value.id}`, {
      method: 'DELETE'
    })
    showDeleteModal.value = false
    await fetchCategories()
  } catch (error: any) {
    console.error('Failed to delete category:', error)
    alert(error.data?.message || 'Failed to delete category')
  } finally {
    deleting.value = false
  }
}

async function handleReorder() {
  const categoryIds = categories.value.map(c => c.id)
  try {
    await $fetch('/api/service-categories/reorder', {
      method: 'POST',
      body: { categoryIds }
    })
    // Update local display order to match new positions
    categories.value.forEach((cat, index) => {
      cat.display_order = index + 1
    })
  } catch (error) {
    console.error('Failed to reorder categories:', error)
    // Refetch to restore correct order
    await fetchCategories()
  }
}

onMounted(() => {
  fetchCategories()
})
</script>
