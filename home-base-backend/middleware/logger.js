const logger = {
  info: (message, meta = {}) => console.log(JSON.stringify({ level: 'info', message, ...meta })),
  error: (message, error = {}) => console.error(JSON.stringify({ level: 'error', message, error: error.message }))
};

const requestLogger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
};

module.exports = { logger, requestLogger };