<template>
  <div class="space-y-2">
    <!-- Country selector (shown only if showCountry is true) -->
    <UiSelect
      v-if="showCountry"
      :model-value="selectedCountry"
      :label="countryLabel"
      @update:model-value="handleCountryChange"
    >
      <option
        v-for="country in countries"
        :key="country.code"
        :value="country.code"
      >
        {{ country.name }}
      </option>
    </UiSelect>

    <!-- State/Province selector -->
    <UiSelect
      :model-value="modelValue"
      :label="regionLabel"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <option value="">
        -- Select {{ regionLabelText }} --
      </option>
      <option
        v-for="region in regions"
        :key="region.code"
        :value="region.code"
      >
        {{ region.name }}
      </option>
    </UiSelect>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { JURISDICTIONS, getRegions } from '~/data/jurisdictions'

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  /** Show the country dropdown (defaults to false — just shows state/province for US) */
  showCountry?: boolean
  /** Default country code */
  defaultCountry?: string
}>(), {
  label: 'Jurisdiction',
  showCountry: false,
  defaultCountry: 'US'
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedCountry = ref(props.defaultCountry)

const countries = JURISDICTIONS

const regions = computed(() => getRegions(selectedCountry.value))

const regionLabelText = computed(() =>
  selectedCountry.value === 'CA' ? 'Province' : 'State'
)

const countryLabel = computed(() => 'Country')
const regionLabel = computed(() => props.label || `${regionLabelText.value}`)

function handleCountryChange(code: string) {
  selectedCountry.value = code
}
</script>
