const url = require('node:url');

function validateRequest(reqUrl, expectedToken) {
  const parsed = url.parse(reqUrl, true);
  return parsed.query.token === expectedToken;
}

module.exports = { validateRequest };
