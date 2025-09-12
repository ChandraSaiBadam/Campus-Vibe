const serverless = require('serverless-http');
const app = require('./app');

// Export the serverless-wrapped app
module.exports.handler = serverless(app);