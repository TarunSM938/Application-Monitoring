const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const response = {
    error: err.message || 'Internal server error',
  };

  if (err.details) {
    response.details = err.details;
  }

  if (status >= 500) {
    console.error('Unhandled Error:', err);
  }

  res.status(status).json(response);
};

module.exports = errorHandler;
