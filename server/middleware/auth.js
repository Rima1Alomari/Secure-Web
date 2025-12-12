// Temporary: Disabled authentication for testing
// Re-enable when ready by uncommenting the real implementation

export const authenticate = (req, res, next) => {
  // Temporarily allow all requests for testing
  req.user = { _id: 'mock-user-id' }
  next()
  
  // Real implementation (commented for now):
  // try {
  //   const token = req.headers.authorization?.split(' ')[1]
  //   if (!token) {
  //     return res.status(401).json({ error: 'No token provided' })
  //   }
  //   const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
  //   req.user = { _id: decoded.userId }
  //   next()
  // } catch (error) {
  //   res.status(401).json({ error: 'Invalid token' })
  // }
}
