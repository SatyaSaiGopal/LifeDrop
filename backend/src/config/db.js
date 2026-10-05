const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

/**
 * Single shared Mongo connection. Callers await connect() before serving traffic.
 */
async function connect(uri = config.mongoUri) {
  mongoose.set('strictQuery', true);
  // Surface duplicate-key and validation errors as thrown exceptions.
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: !config.isProduction, // build indexes automatically outside prod
  });
  logger.info(`MongoDB connected (${mongoose.connection.name})`);
  return mongoose.connection;
}

async function disconnect() {
  await mongoose.disconnect();
}

module.exports = { connect, disconnect, mongoose };
