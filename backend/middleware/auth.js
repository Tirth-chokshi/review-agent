import axios from 'axios';

const refreshAccessToken = async (req, res, next) => {
  try {
    // Check if token exists and is not expired
    if (req.session.tokens?.access_token && req.session.tokens.expires_at > Date.now()) {
      return next();
    }

    // If no refresh token, user needs to re-authenticate
    if (!req.session.tokens?.refresh_token) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        code: 'SESSION_EXPIRED'
      });
    }

    // Attempt to refresh the access token
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: req.session.tokens.refresh_token,
      grant_type: 'refresh_token',
    });

    // Update session with new tokens
    req.session.tokens = {
      ...req.session.tokens,
      access_token: response.data.access_token,
      expires_at: Date.now() + (response.data.expires_in * 1000),
    };

    next();
  } catch (error) {
    console.error('Token refresh failed:', error.response?.data || error.message);
    
    // Clear invalid tokens
    req.session.tokens = null;
    
    res.status(401).json({
      success: false,
      message: 'Session expired. Please log in again.',
      code: 'TOKEN_REFRESH_FAILED'
    });
  }
};

const requireAuth = (req, res, next) => {
  if (!req.session.tokens?.access_token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }
  next();
};

export { refreshAccessToken };

export default {
  refreshAccessToken,
  requireAuth,
};
