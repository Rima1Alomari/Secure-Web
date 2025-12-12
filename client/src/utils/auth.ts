// Temporary: Always return a mock token for testing
// Remove this and uncomment real auth when ready

export const getToken = (): string | null => {
  // Temporarily return a mock token for testing
  return 'mock-token-for-testing'
  
  // Real implementation (commented for now):
  // return localStorage.getItem('token')
}

export const setToken = (token: string): void => {
  localStorage.setItem('token', token)
}

export const removeToken = (): void => {
  localStorage.removeItem('token')
}
