// Backend Authorization Middleware
const admin = require('firebase-admin');

/**
 * Input validation utilities
 */
const validateInput = {
  userId: (uid) => {
    if (!uid || typeof uid !== 'string') return null;
    if (!/^[a-zA-Z0-9]{20,128}$/.test(uid)) return null;
    return uid;
  },
  
  coordinate: (coord) => {
    const num = parseFloat(coord);
    if (isNaN(num) || !isFinite(num)) return null;
    if (num < -180 || num > 180) return null;
    return num;
  },
  
  string: (input, maxLength = 1000) => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[<>\"'&]/g, '')
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
      .trim()
      .substring(0, maxLength);
  }
};

/**
 * Authentication middleware
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Missing or invalid authorization header'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Missing authentication token'
      });
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = validateInput.userId(decodedToken.uid);
    
    if (!uid) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Invalid user ID'
      });
    }

    // Get user data from Firestore
    const userDoc = await admin.firestore()
      .collection('userInformation')
      .doc(uid)
      .get();

    const userData = userDoc.exists ? userDoc.data() : {};
    
    // Attach user context to request
    req.user = {
      uid: uid,
      email: decodedToken.email,
      role: userData.role || 'user',
      adminLocations: userData.adminLocations || [],
      emailVerified: decodedToken.email_verified
    };

    next();
  } catch (error) {
    //console.error('Authentication error:', error);
    res.status(401).json({ 
      error: 'Unauthorized',
      details: 'Invalid or expired token'
    });
  }
};

/**
 * Authorization helper functions
 */
const authHelpers = {
  canAccessUser: (currentUser, targetUserId) => {
    return currentUser.uid === targetUserId || currentUser.role === 'admin';
  },
  
  canModifyLocation: (currentUser, locationId) => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'editor') {
      return currentUser.adminLocations.includes(locationId);
    }
    return false;
  },
  
  canAccessLocation: (currentUser, locationId) => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'editor') {
      return currentUser.adminLocations.includes(locationId);
    }
    return true; // Regular users can view locations
  }
};

/**
 * Create authorization middleware for specific operations
 */
const requireAuth = (operation, resource) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Authentication required'
      });
    }

    const { user } = req;
    let authorized = false;

    switch (resource) {
      case 'user':
        const targetUserId = validateInput.userId(req.params.userId || req.body.userId);
        if (!targetUserId) {
          return res.status(400).json({ 
            error: 'Invalid user ID'
          });
        }
        authorized = authHelpers.canAccessUser(user, targetUserId);
        break;
        
      case 'location':
        const locationId = validateInput.string(req.params.locationId || req.body.locationId);
        if (!locationId) {
          return res.status(400).json({ 
            error: 'Invalid location ID'
          });
        }
        
        if (operation === 'read') {
          authorized = authHelpers.canAccessLocation(user, locationId);
        } else {
          authorized = authHelpers.canModifyLocation(user, locationId);
        }
        break;
        
      case 'admin':
        authorized = user.role === 'admin';
        break;
        
      default:
        authorized = true; // Public resource
    }

    if (!authorized) {
      return res.status(403).json({ 
        error: 'Forbidden',
        details: `Insufficient permissions for ${operation} on ${resource}`
      });
    }

    next();
  };
};

/**
 * Rate limiting for authenticated users
 */
const createUserRateLimit = (windowMs, max) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.uid;
    if (!userId) return next();
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!attempts.has(userId)) {
      attempts.set(userId, []);
    }
    
    const userAttempts = attempts.get(userId);
    const validAttempts = userAttempts.filter(time => time > windowStart);
    
    if (validAttempts.length >= max) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        details: 'Too many requests from this user'
      });
    }
    
    validAttempts.push(now);
    attempts.set(userId, validAttempts);
    
    next();
  };
};

/**
 * Request logging middleware
 */
const logRequest = (req, res, next) => {
  const start = Date.now();
  const { method, path, ip } = req;
  const userId = req.user?.uid || 'anonymous';
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    // Log security-relevant events
    if (statusCode === 401 || statusCode === 403) {
      //console.warn('Security event:', {
    //     method,
    //     path,
    //     ip,
    //     userId,
    //     statusCode,
    //     duration,
    //     timestamp: new Date().toISOString()
    //   });
    }
  });
  
  next();
};

module.exports = {
  authenticateUser,
  requireAuth,
  createUserRateLimit,
  logRequest,
  validateInput
};