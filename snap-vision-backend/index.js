const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

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

app.get("/api/directions", async (req, res) => {
  const { start, end, mode = "foot-walking" } = req.query;
  const apiKey = process.env.ORS_API_KEY;

  if (!start || !end) {
    return res.status(400).json({ error: "Missing start or end parameters" });
  }

  try {
    const url = `https://api.openrouteservice.org/v2/directions/${mode}/geojson`;

    const [startLon, startLat] = start.split(",").map(Number);
    const [endLon, endLat] = end.split(",").map(Number);

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
      },
    );

    res.json(response.data);
  } catch (error) {
    //consoleerror("ORS error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch directions" });
  }
});

const PORT = process.env.PORT || 8080; // Firebase App Hosting typically uses 8080
const server = app.listen(PORT, () =>
  //consolelog(`Server running on port ${server.address().port}`),
);

module.exports = server;