<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Help Center</h1>
      <p class="text-gray-600 mt-1">Find answers to common questions and learn how to use Your Trusted Planner</p>
    </div>

    <div class="grid grid-cols-12 gap-8">
      <!-- Sidebar Navigation -->
      <div class="col-span-3">
        <UiCard :padding="false">
          <nav class="p-2">
            <button
              v-for="topic in helpTopics"
              :key="topic.slug"
              @click="selectTopic(topic.slug)"
              class="w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left"
              :class="selectedTopic === topic.slug
                ? 'bg-burgundy-50 text-burgundy-600'
                : 'text-gray-700 hover:bg-gray-50'"
            >
              <component :is="topic.icon" class="w-5 h-5 mr-3 flex-shrink-0" />
              <span>{{ topic.title }}</span>
            </button>
          </nav>
        </UiCard>
      </div>

      <!-- Content Area -->
      <div class="col-span-9">
        <UiCard>
          <div v-if="isLoading" class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-500"></div>
          </div>
          <div v-else-if="error" class="text-red-600 py-8">
            {{ error }}
          </div>
          <UiMarkdownRenderer v-else :content="helpContent" />
        </UiCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  BookOpen,
  Users,
  Map,
  FileText,
  Calendar,
  Settings,
  HelpCircle,
  Upload
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const { data: sessionData } = await useFetch('/api/auth/session')
const isLawyer = computed(() => {
  const role = sessionData.value?.user?.role
  return role === 'LAWYER' || role === 'ADMIN'
})

// Help topics for lawyers
const lawyerTopics = [
  { slug: 'getting-started', title: 'Getting Started', icon: BookOpen },
  { slug: 'managing-clients', title: 'Managing Clients', icon: Users },
  { slug: 'journeys-workflows', title: 'Journeys & Workflows', icon: Map },
  { slug: 'documents', title: 'Documents', icon: FileText },
  { slug: 'appointments', title: 'Appointments', icon: Calendar },
  { slug: 'administration', title: 'Administration', icon: Settings }
]

// Help topics for clients
const clientTopics = [
  { slug: 'client-getting-started', title: 'Getting Started', icon: BookOpen },
  { slug: 'client-journeys', title: 'Your Journeys', icon: Map },
  { slug: 'client-documents', title: 'Your Documents', icon: FileText },
  { slug: 'client-uploads', title: 'Uploading Files', icon: Upload },
  { slug: 'client-faq', title: 'FAQ', icon: HelpCircle }
]

const helpTopics = computed(() => isLawyer.value ? lawyerTopics : clientTopics)

const selectedTopic = ref('')
const helpContent = ref('')
const isLoading = ref(false)
const error = ref('')

const selectTopic = async (slug: string) => {
  selectedTopic.value = slug
  isLoading.value = true
  error.value = ''

  // Update URL without navigation
  router.replace({ query: { topic: slug } })

  try {
    const { data } = await useFetch(`/api/help/${slug}`)
    if (data.value?.content) {
      helpContent.value = data.value.content
    } else {
      error.value = 'Help content not found'
    }
  } catch (e) {
    error.value = 'Failed to load help content'
    console.error('Error loading help:', e)
  } finally {
    isLoading.value = false
  }
}

// Get initial topic from URL or default to first
const getInitialTopic = () => {
  const urlTopic = route.query.topic as string
  const availableTopics = helpTopics.value.map(t => t.slug)

  // If URL has a valid topic, use it
  if (urlTopic && availableTopics.includes(urlTopic)) {
    return urlTopic
  }

  // Otherwise use first topic
  return helpTopics.value[0]?.slug || ''
}

// Load initial topic on mount
onMounted(() => {
  const initialTopic = getInitialTopic()
  if (initialTopic) {
    selectTopic(initialTopic)
  }
})

// Reload content when role changes
watch(isLawyer, () => {
  const initialTopic = getInitialTopic()
  if (initialTopic) {
    selectTopic(initialTopic)
  }
})

// Watch for URL changes (e.g., from HelpLink component)
watch(() => route.query.topic, (newTopic) => {
  if (newTopic && newTopic !== selectedTopic.value) {
    selectTopic(newTopic as string)
  }
})
</script>
