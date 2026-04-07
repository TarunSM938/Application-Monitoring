const createHttpError = require('../utils/httpError');

const notFound = (req, res, next) => {
  next(createHttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
