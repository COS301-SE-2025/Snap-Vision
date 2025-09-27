const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const admin = require('firebase-admin');
const { 
  authenticateUser, 
  requireAuth, 
  createUserRateLimit, 
  logRequest, 
  validateInput 
} = require('./middleware/auth');

// Input sanitization utility (kept for backward compatibility)
const sanitizeInput = {
  // Remove potentially harmful characters and normalize input
  string: (input) => {
    return validateInput.string(input);
  },
  
  // Validate and sanitize coordinates
  coordinate: (input) => {
    return validateInput.coordinate(input);
  },
  
  // Validate mode parameter
  mode: (input) => {
    const allowedModes = [
      'foot-walking', 
      'driving-car', 
      'cycling-regular', 
      'wheelchair'
    ];
    return allowedModes.includes(input) ? input : 'foot-walking';
  }
};

// Rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit API requests to 20 per minute
  message: {
    error: 'API rate limit exceeded, please try again later.'
  }
});

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

// Apply rate limiting
app.use(limiter);
app.use('/api/', apiLimiter);

// Apply request logging
app.use(logRequest);

// Secure CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://snap-vision-f6954.web.app',
      'https://snap-vision-f6954.firebaseapp.com',
      'https://snap-vision-backend--snap-vision-f6954.europe-west4.hosted.app'
      // For development
      // ...(process.env.NODE_ENV === 'development' ? [
      //   'http://localhost:3000',
      //   'http://localhost:8081', // Metro bundler
      //   'http://127.0.0.1:3000',
      //   'http://127.0.0.1:8081'
      // ] : [])
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, // Allow cookies if needed
  maxAge: 86400 // Cache preflight requests for 24 hours
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Add size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.get("/", (req, res) => {
  res.send("Snap Vision backend is running");
});

// Protected API endpoints with authentication
const userRateLimit = createUserRateLimit(60000, 30); // 30 requests per minute per user

// Example protected endpoint for user data
app.get("/api/user/:userId", authenticateUser, requireAuth('read', 'user'), userRateLimit, async (req, res) => {
  try {
    const userId = validateInput.userId(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const userDoc = await admin.firestore()
      .collection('userInformation')
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    res.json({
      id: userDoc.id,
      name: validateInput.string(userData.name),
      email: userData.email,
      role: userData.role || 'user'
    });
  } catch (error) {
    //console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example protected endpoint for location data
app.get("/api/locations/:locationId", authenticateUser, requireAuth('read', 'location'), userRateLimit, async (req, res) => {
  try {
    const locationId = validateInput.string(req.params.locationId);
    if (!locationId) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }

    const locationDoc = await admin.firestore()
      .collection('locations')
      .doc(locationId)
      .get();

    if (!locationDoc.exists) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({
      id: locationDoc.id,
      ...locationDoc.data()
    });
  } catch (error) {
    //console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get("/api/directions", async (req, res) => {
  try {
    // Sanitize and validate inputs
    const startRaw = sanitizeInput.string(req.query.start || '');
    const endRaw = sanitizeInput.string(req.query.end || '');
    const modeRaw = sanitizeInput.string(req.query.mode || 'foot-walking');

    // Validate required parameters
    if (!startRaw || !endRaw) {
      return res.status(400).json({ 
        error: "Missing or invalid start/end parameters",
        details: "Both start and end coordinates are required"
      });
    }

    // Parse and validate coordinates
    const startCoords = startRaw.split(",");
    const endCoords = endRaw.split(",");

    if (startCoords.length !== 2 || endCoords.length !== 2) {
      return res.status(400).json({ 
        error: "Invalid coordinate format",
        details: "Coordinates must be in format 'longitude,latitude'"
      });
    }

    const startLon = sanitizeInput.coordinate(startCoords[0]);
    const startLat = sanitizeInput.coordinate(startCoords[1]);
    const endLon = sanitizeInput.coordinate(endCoords[0]);
    const endLat = sanitizeInput.coordinate(endCoords[1]);

    // Validate all coordinates are valid numbers
    if (startLon === null || startLat === null || endLon === null || endLat === null) {
      return res.status(400).json({ 
        error: "Invalid coordinates",
        details: "All coordinates must be valid numbers within valid ranges"
      });
    }

    // Additional validation for realistic coordinate ranges
    if (Math.abs(startLat) > 90 || Math.abs(endLat) > 90) {
      return res.status(400).json({ 
        error: "Invalid latitude",
        details: "Latitude must be between -90 and 90 degrees"
      });
    }

    if (Math.abs(startLon) > 180 || Math.abs(endLon) > 180) {
      return res.status(400).json({ 
        error: "Invalid longitude",
        details: "Longitude must be between -180 and 180 degrees"
      });
    }

    // Sanitize mode
    const mode = sanitizeInput.mode(modeRaw);

    // Validate API key exists
    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) {
      //console.error('ORS_API_KEY not configured');
      return res.status(500).json({ 
        error: "Service configuration error",
        details: "External routing service not properly configured"
      });
    }

    const url = `https://api.openrouteservice.org/v2/directions/${mode}/geojson`;

    const response = await axios.post(
      url,
      {
        coordinates: [
          [startLon, startLat],
          [endLon, endLat],
        ],
      },
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
      },
    );

    // Validate response structure before sending
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid response from routing service');
    }

    res.json(response.data);
  } catch (error) {
    //console.error("ORS error:", error?.response?.data || error.message);
    
    // Don't expose internal error details to client
    if (error.code === 'ECONNABORTED') {
      res.status(408).json({ 
        error: "Request timeout",
        details: "The routing service took too long to respond"
      });
    } else if (error?.response?.status === 429) {
      res.status(429).json({ 
        error: "Rate limit exceeded",
        details: "Too many requests to routing service"
      });
    } else if (error?.response?.status >= 400 && error?.response?.status < 500) {
      res.status(400).json({ 
        error: "Invalid request",
        details: "The routing service rejected the request"
      });
    } else {
      res.status(500).json({ 
        error: "Failed to fetch directions",
        details: "An unexpected error occurred"
      });
    }
  }
});

const PORT = process.env.PORT || 8080; // Firebase App Hosting typically uses 8080
const server = app.listen(PORT, () => {
  //console.log(`Server running on port ${server.address().port}`);
});

module.exports = server;