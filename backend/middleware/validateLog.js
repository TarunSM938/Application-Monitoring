const { body, validationResult } = require('express-validator');
const createHttpError = require('../utils/httpError');

const validateLog = [
  body('api_name')
    .notEmpty().withMessage('api_name is required')
    .isString().withMessage('api_name must be a string'),

  body('timestamp')
    .notEmpty().withMessage('timestamp is required')
    .isISO8601().withMessage('timestamp must be a valid ISO8601 date'),

  body('response_time')
    .optional({ nullable: true })
    .isNumeric().withMessage('response_time must be a number'),

  body('status_code')
    .optional({ nullable: true })
    .isInt().withMessage('status_code must be an integer'),

  body('error_message')
    .optional({ nullable: true })
    .isString().withMessage('error_message must be a string'),

  body('error_type')
    .optional({ nullable: true })
    .isString().withMessage('error_type must be a string'),

  body('stack_trace')
    .optional({ nullable: true })
    .isString().withMessage('stack_trace must be a string'),

  body('session_id')
    .optional({ nullable: true })
    .isString().withMessage('session_id must be a string'),

  body('device_info')
    .optional({ nullable: true })
    .isString().withMessage('device_info must be a string'),

  body('trace_id')
    .optional({ nullable: true })
    .isString().withMessage('trace_id must be a string'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createHttpError(400, 'Validation failed', errors.array()));
    }
    next();
  },
];

module.exports = validateLog;
