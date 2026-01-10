import { keysToCamel, keysToSnake } from '~/utils/caseTransform'

type FetchOptions = Parameters<typeof $fetch>[1]

/**
 * A wrapper around $fetch that automatically transforms:
 * - Response keys from snake_case to camelCase
 * - Request body keys from camelCase to snake_case (optional)
 *
 * Usage:
 *   const { apiFetch } = useApi()
 *   const data = await apiFetch('/api/users')
 *   // data.firstName instead of data.first_name
 *
 * Or with the global helper:
 *   const data = await $api('/api/users')
 */
export function useApi() {
  /**
   * Fetch with automatic case transformation
   * @param url - The URL to fetch
   * @param options - Fetch options (same as $fetch)
   * @param transformRequest - Whether to transform request body to snake_case (default: false)
   */
  async function apiFetch<T>(
    url: string,
    options?: FetchOptions & { transformRequest?: boolean },
    transformRequest = false
  ): Promise<T> {
    const { transformRequest: shouldTransformRequest, ...fetchOptions } = options || {}

    // Transform request body to snake_case if requested
    if ((shouldTransformRequest || transformRequest) && fetchOptions.body) {
      fetchOptions.body = keysToSnake(fetchOptions.body)
    }

    const response = await $fetch<T>(url, fetchOptions)

    // Transform response to camelCase
    return keysToCamel(response) as T
  }

  return {
    apiFetch
  }
}

/**
 * Global API fetch helper with automatic camelCase transformation
 * Can be used directly without the composable:
 *
 *   const users = await $api<{ users: User[] }>('/api/users')
 */
export async function $api<T>(url: string, options?: FetchOptions): Promise<T> {
  const response = await $fetch<T>(url, options)
  return keysToCamel(response) as T
}

/**
 * Wrapper around useFetch with automatic camelCase transformation
 *
 * Usage:
 *   const { data, pending, error } = await useApiFetch<{ users: User[] }>('/api/users')
 *   // data.value.users[0].firstName instead of first_name
 */
export function useApiFetch<T>(
  url: string | (() => string),
  options?: Parameters<typeof useFetch>[1]
) {
  return useFetch<T>(url, {
    ...options,
    transform: (data) => {
      const transformed = keysToCamel(data) as T
      // Apply any additional transform from options
      if (options?.transform) {
        return options.transform(transformed)
      }
      return transformed
    }
  })
}
