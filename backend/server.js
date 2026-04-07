const express = require("express");
const cors = require("cors");
const { pool } = require("./db/connection");
const logsRoutes = require("./routes/logs");
const metricsRoutes = require("./routes/metrics");
const alertsRoutes = require("./routes/alerts");
const analyticsRoutes = require("./routes/analytics");

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'connected',
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      db: 'disconnected',
    });
  }
});

app.use('/api/logs', logsRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/analytics', analyticsRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
