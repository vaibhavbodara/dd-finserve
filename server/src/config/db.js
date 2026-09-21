const mongoose = require('mongoose');

const connectDB = async () => {
  mongoose.set('bufferCommands', false);
  try {
    const isAtlas = (process.env.MONGODB_URI || '').includes('mongodb.net');
    const options = {
      serverSelectionTimeoutMS: 10000,
      ...(isAtlas ? { tls: true, tlsAllowInvalidCertificates: true } : {}),
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dd_finserve', options);
    console.log(`✅ MongoDB Live Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('ℹ️  Tip: If using local MongoDB, ensure MongoDB service is running (mongod).');
    console.log('ℹ️  Tip: If using MongoDB Atlas, configure MONGODB_URI in server/.env');
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected.');
});

module.exports = connectDB;
