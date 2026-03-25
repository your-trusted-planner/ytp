/**
 * Field component registry — maps FieldType to Vue components.
 *
 * To add a new field type:
 * 1. Create FormFieldXyz.vue with the standard props/emits interface
 * 2. Import it here and add to FIELD_REGISTRY
 */
import type { Component } from 'vue'
import type { FieldType } from '~/types/form'

import FormFieldText from './FormFieldText.vue'
import FormFieldTextarea from './FormFieldTextarea.vue'
import FormFieldEmail from './FormFieldEmail.vue'
import FormFieldPhone from './FormFieldPhone.vue'
import FormFieldNumber from './FormFieldNumber.vue'
import FormFieldDate from './FormFieldDate.vue'
import FormFieldSelect from './FormFieldSelect.vue'
import FormFieldMultiSelect from './FormFieldMultiSelect.vue'
import FormFieldRadio from './FormFieldRadio.vue'
import FormFieldCheckbox from './FormFieldCheckbox.vue'
import FormFieldYesNo from './FormFieldYesNo.vue'
import FormFieldFileUpload from './FormFieldFileUpload.vue'
import FormFieldScheduler from './FormFieldScheduler.vue'
import FormFieldContent from './FormFieldContent.vue'

export const FIELD_REGISTRY: Record<FieldType, Component> = {
  text: FormFieldText,
  textarea: FormFieldTextarea,
  email: FormFieldEmail,
  phone: FormFieldPhone,
  number: FormFieldNumber,
  date: FormFieldDate,
  select: FormFieldSelect,
  multi_select: FormFieldMultiSelect,
  radio: FormFieldRadio,
  checkbox: FormFieldCheckbox,
  yes_no: FormFieldYesNo,
  file_upload: FormFieldFileUpload,
  scheduler: FormFieldScheduler,
  content: FormFieldContent
}
