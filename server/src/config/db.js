const mongoose = require('mongoose');
const dns = require('dns');

// Public DNS fallback for Windows/ISPs that fail to resolve MongoDB SRV records (ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not permitted
}

const connectDB = async () => {
  mongoose.set('bufferCommands', false);
  try {
    const isAtlas = (process.env.MONGODB_URI || '').includes('mongodb.net');
    const options = {
      serverSelectionTimeoutMS: 10000,
      dbName: 'dd_finserve',
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
