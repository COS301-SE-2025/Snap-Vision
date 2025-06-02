const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Snap Vision backend is running');
});

app.get('/ping', (req, res) => {
  res.send('pong!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port ${PORT}"));