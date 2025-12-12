const TOKEN_KEY = 'secure_web_token'

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY)
}

