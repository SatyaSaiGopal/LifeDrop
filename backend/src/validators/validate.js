const ApiError = require('../utils/ApiError');

/**
 * Validate `payload` against a Zod schema, returning the parsed value.
 * On failure throws a 400 ApiError whose `details` is a field->message map the
 * frontend can attach to the right inputs.
 */
function validate(schema, payload) {
  const result = schema.safeParse(payload);
  if (result.success) return result.data;

  const details = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!details[key]) details[key] = issue.message;
  }
  throw ApiError.badRequest('Please correct the highlighted fields', details);
}

/** Express middleware factory: validates req.body. */
const validateBody = (schema) => (req, _res, next) => {
  try {
    req.body = validate(schema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};

/** Express middleware factory: validates req.query (without mutating the getter). */
const validateQuery = (schema) => (req, _res, next) => {
  try {
    req.validatedQuery = validate(schema, req.query);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { validate, validateBody, validateQuery };
