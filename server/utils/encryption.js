import _sodium from 'libsodium-wrappers'

let sodium

// Initialize libsodium
export const initSodium = async () => {
  if (!sodium) {
    await _sodium.ready
    sodium = _sodium
  }
  return sodium
}

// Generate quantum-resistant key pair
export const generateKeyPair = async () => {
  await initSodium()
  return sodium.crypto_box_keypair()
}

// Encrypt data with quantum-resistant encryption
export const encryptData = async (data, publicKey, privateKey) => {
  await initSodium()
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)
  const encrypted = sodium.crypto_box_easy(
    typeof data === 'string' ? sodium.from_string(data) : data,
    nonce,
    publicKey,
    privateKey
  )
  return {
    encrypted: sodium.to_base64(encrypted),
    nonce: sodium.to_base64(nonce)
  }
}

// Decrypt data
export const decryptData = async (encryptedData, nonce, publicKey, privateKey) => {
  await initSodium()
  const decrypted = sodium.crypto_box_open_easy(
    sodium.from_base64(encryptedData),
    sodium.from_base64(nonce),
    publicKey,
    privateKey
  )
  return sodium.to_string(decrypted)
}

// Hash file for integrity checking
export const hashFile = async (fileBuffer) => {
  await initSodium()
  return sodium.to_base64(sodium.crypto_generichash(64, fileBuffer))
}

// Generate secure random token
export const generateSecureToken = async (length = 32) => {
  await initSodium()
  return sodium.to_base64(sodium.randombytes_buf(length))
}


