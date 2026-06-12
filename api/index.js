// Vercel serverless function entry point
// Wraps the Express app as a single serverless function

const path = require('path');

// Set the server directory so relative paths work
process.env.SERVER_DIR = path.join(__dirname, '..', 'server');

module.exports = require('../server/index-vercel');
