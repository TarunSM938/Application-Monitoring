const express = require("express");
const cors = require("cors");
const logsRoutes = require("./routes/logs");
const metricsRoutes = require("./routes/metrics");
const alertsRoutes = require("./routes/alerts");
const analyticsRoutes = require("./routes/analytics");

const app = express();

app.use(cors());
app.use(express.json());

// Use logs routes
app.use('/api/logs', logsRoutes);

// Use metrics routes
app.use('/api/metrics', metricsRoutes);

// Use alerts routes
app.use('/api/alerts', alertsRoutes);

// Use analytics routes
app.use('/api/analytics', analyticsRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
