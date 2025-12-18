// Temporary: Disabled authentication for testing
// Re-enable when ready by uncommenting the real implementation

export const authenticate = (req, res, next) => {
  // In development mode, use a mock user
  if (process.env.NODE_ENV === 'development') {
    // Use a valid MongoDB ObjectId format for development
    req.user = { 
      _id: '507f1f77bcf86cd799439011', // Valid ObjectId format
      toString: () => '507f1f77bcf86cd799439011'
    }
    return next()
  }
  
  // Temporarily allow all requests for testing (fallback)
  req.user = { 
    _id: '507f1f77bcf86cd799439011',
    toString: () => '507f1f77bcf86cd799439011'
  }
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
