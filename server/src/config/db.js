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
    const rawUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dd_finserve';
    const isAtlas = rawUri.includes('mongodb.net');

    // Extract database name from URI if specified (e.g. ...mongodb.net/dd_finserve_uat?...)
    const dbMatch = rawUri.match(/mongodb(?:\+srv)?:\/\/[^\/]+\/([^?]+)/);
    const uriDbName = dbMatch && dbMatch[1] && dbMatch[1].trim() ? dbMatch[1].trim() : null;

    // Priority: DB_NAME env > URI path > NODE_ENV convention > dd_finserve default
    const targetDbName =
      process.env.DB_NAME ||
      uriDbName ||
      (process.env.NODE_ENV === 'production'
        ? 'dd_finserve_prod'
        : process.env.NODE_ENV === 'uat'
          ? 'dd_finserve_uat'
          : 'dd_finserve_dev');

    const options = {
      serverSelectionTimeoutMS: 10000,
      dbName: targetDbName,
      ...(isAtlas ? { tls: true, tlsAllowInvalidCertificates: true } : {}),
    };

    const conn = await mongoose.connect(rawUri, options);
    console.log(`✅ MongoDB Live Connected [${process.env.NODE_ENV || 'development'}]: ${conn.connection.host}/${conn.connection.name}`);
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
