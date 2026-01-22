import { useToast as useVueToast, TYPE } from 'vue-toastification'
import type { ToastOptions } from 'vue-toastification/dist/types/types'

export interface ToastNotifyOptions {
  timeout?: number
  onClick?: () => void
  onClose?: () => void
}

export function useToast() {
  const toast = useVueToast()

  const success = (message: string, options?: ToastNotifyOptions) => {
    return toast.success(message, {
      timeout: options?.timeout ?? 5000,
      onClick: options?.onClick,
      onClose: options?.onClose
    } as ToastOptions)
  }

  const error = (message: string, options?: ToastNotifyOptions) => {
    return toast.error(message, {
      timeout: options?.timeout ?? 8000,
      onClick: options?.onClick,
      onClose: options?.onClose
    } as ToastOptions)
  }

  const warning = (message: string, options?: ToastNotifyOptions) => {
    return toast.warning(message, {
      timeout: options?.timeout ?? 6000,
      onClick: options?.onClick,
      onClose: options?.onClose
    } as ToastOptions)
  }

  const info = (message: string, options?: ToastNotifyOptions) => {
    return toast.info(message, {
      timeout: options?.timeout ?? 5000,
      onClick: options?.onClick,
      onClose: options?.onClose
    } as ToastOptions)
  }

  const dismiss = (id?: string | number) => {
    if (id !== undefined) {
      toast.dismiss(id)
    } else {
      toast.clear()
    }
  }

  return {
    success,
    error,
    warning,
    info,
    dismiss
  }
}
