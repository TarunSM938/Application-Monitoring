const asyncHandler = require('../utils/asyncHandler');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const okDemo = asyncHandler(async (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend responded successfully',
    timestamp: new Date().toISOString(),
  });
});

const slowDemo = asyncHandler(async (_req, res) => {
  await wait(6000);

  res.json({
    status: 'ok',
    message: 'Slow endpoint completed after 6 seconds',
    timestamp: new Date().toISOString(),
  });
});

const serverErrorDemo = asyncHandler(async (_req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'Database connection pool exhausted',
    timestamp: new Date().toISOString(),
  });
});

const badJsonDemo = asyncHandler(async (_req, res) => {
  res.type('application/json');
  res.status(200).send('{"status":"ok","message":"invalid json response"');
});

module.exports = {
  okDemo,
  slowDemo,
  serverErrorDemo,
  badJsonDemo,
};
