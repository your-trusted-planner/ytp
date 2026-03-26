declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, any>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export {}
