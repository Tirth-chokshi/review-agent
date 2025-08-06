// Error handling middleware to ensure all responses are JSON
export const jsonErrorHandler = (err, req, res, next) => {
  console.error('🚨 Error caught by middleware:', err);

  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Default error response
  const errorResponse = {
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Set appropriate status code
  const statusCode = err.statusCode || err.status || 500;

  // Always return JSON
  res.status(statusCode).json(errorResponse);
};

// 404 handler for unmatched routes
export const notFoundHandler = (req, res) => {
  console.log('🔍 404 - Route not found:', req.method, req.url);
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
};

export default { jsonErrorHandler, notFoundHandler };
