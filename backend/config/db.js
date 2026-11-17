const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async (uri = env.MONGO_URI) => {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(uri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
  });
  if (env.NODE_ENV !== 'test') {
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  }
  return conn;
};

module.exports = connectDB;
