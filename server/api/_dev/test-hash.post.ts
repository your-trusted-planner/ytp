export default defineEventHandler(async (event) => {
  const { password } = await readBody(event)

  console.log('[Test] Hashing password:', password)
  const hashed = await hashPassword(password)
  console.log('[Test] Hash result:', hashed)
  console.log('[Test] Hash starts with:', hashed.substring(0, 20))

  console.log('[Test] Verifying password...')
  const isValid = await verifyPassword(password, hashed)
  console.log('[Test] Verification result:', isValid)

  return {
    password,
    hash: hashed,
    hashPrefix: hashed.substring(0, 20),
    verificationWorks: isValid
  }
})
