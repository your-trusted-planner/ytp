/**
 * Encryption utilities for sensitive data storage
 *
 * Uses AES-GCM with a 256-bit master key stored in Cloudflare Secrets Store.
 * API keys and other sensitive credentials are encrypted before storage in KV.
 *
 * Supports two contexts:
 * - H3 event context (HTTP requests)
 * - Cloudflare env context (queue consumers)
 */

import type { H3Event } from 'h3'

/**
 * Context for accessing the master encryption key
 * Can be either an H3 event or a Cloudflare env object
 */
export type EncryptionContext = H3Event | { cloudflareEnv: any }

/**
 * Encrypt a plaintext string using AES-GCM with the master encryption key
 *
 * @param context - H3 event or Cloudflare env context
 * @param plaintext - The plaintext to encrypt
 * @returns Base64-encoded encrypted data with IV prepended
 */
export async function encrypt(context: EncryptionContext, plaintext: string): Promise<string> {
  const masterKey = await getMasterKey(context)

  // Generate a random IV (Initialization Vector)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Import the master key
  const key = await crypto.subtle.importKey(
    'raw',
    hexToArrayBuffer(masterKey),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  // Encrypt the plaintext
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return arrayBufferToBase64(combined)
}

/**
 * Decrypt an encrypted string using AES-GCM with the master encryption key
 *
 * @param context - H3 event or Cloudflare env context
 * @param encryptedData - Base64-encoded encrypted data with IV prepended
 * @returns Decrypted plaintext string
 */
export async function decrypt(context: EncryptionContext, encryptedData: string): Promise<string> {
  const masterKey = await getMasterKey(context)

  // Decode from base64
  const combined = base64ToArrayBuffer(encryptedData)

  // Extract IV and ciphertext
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  // Import the master key
  const key = await crypto.subtle.importKey(
    'raw',
    hexToArrayBuffer(masterKey),
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  // Decrypt the ciphertext
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Get the master encryption key from Cloudflare Secrets Store or environment variable (dev)
 *
 * Production: Uses Cloudflare Secrets Store (YTP_MASTER_ENCRYPTION_KEY)
 * Development: Falls back to YTP_MASTER_KEY environment variable
 */
async function getMasterKey(context: EncryptionContext): Promise<string> {
  // Determine the env object based on context type
  let env: any

  if ('cloudflareEnv' in context) {
    // Queue consumer context - env passed directly
    env = context.cloudflareEnv
  } else {
    // H3 event context
    env = context.context?.cloudflare?.env
  }

  // Try Secrets Store first (production)
  if (env?.YTP_MASTER_ENCRYPTION_KEY) {
    const masterKey = await env.YTP_MASTER_ENCRYPTION_KEY.get()
    if (masterKey) {
      return masterKey
    }
  }

  // Fallback to environment variable for local development
  const config = useRuntimeConfig()
  const devKey = (config as any).ytpMasterKey || process.env.YTP_MASTER_KEY

  if (devKey) {
    return devKey
  }

  throw createError({
    statusCode: 500,
    message: 'Master encryption key not configured. Set YTP_MASTER_KEY env var for local dev or configure Secrets Store for production.'
  })
}

/**
 * Convert hex string to ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes.buffer
}

/**
 * Convert ArrayBuffer to base64 string
 * Uses a chunked approach to avoid call stack issues with large buffers
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)

  // Use Buffer in Node.js environments (local dev)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }

  // Fallback for Workers: chunk the conversion to avoid stack overflow
  const CHUNK_SIZE = 0x8000 // 32KB chunks
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE)
    chunks.push(String.fromCharCode.apply(null, Array.from(chunk)))
  }
  return btoa(chunks.join(''))
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  // Validate base64 format
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('Invalid encrypted data: expected base64 string')
  }

  // Check for valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  if (!base64Regex.test(base64)) {
    throw new Error('Invalid encrypted data: not valid base64 encoding. The credentials may need to be re-saved.')
  }

  // Use Buffer in Node.js environments (local dev)
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }

  // Fallback for Workers
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
