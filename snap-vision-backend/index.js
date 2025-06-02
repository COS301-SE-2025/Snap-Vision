const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/directions', async (req, res) => {
  const { start, end, mode = 'foot-walking' } = req.query;
  const apiKey = process.env.ORS_API_KEY;

  if (!start || !end) {
    return res.status(400).json({ error: 'Missing start or end parameters' });
  }

  try {
    const url = `https://api.openrouteservice.org/v2/directions/${mode}/geojson`;

    const [startLon, startLat] = start.split(',').map(Number);
    const [endLon, endLat] = end.split(',').map(Number);

    const response = await axios.post(url, {
      coordinates: [[startLon, startLat], [endLon, endLat]]
    }, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('ORS error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch directions' });
  }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));