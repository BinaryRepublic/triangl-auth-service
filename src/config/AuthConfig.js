const fs = require('fs');

const jwtKeysPath = process.env.JWT_KEYS_PATH || `${__dirname}/../../jwtKeys`;
const jwtPrivateKeyName = process.env.JWT_PRIVATE_KEY_NAME || 'jwtRS256.key';
const jwtPublicKeyName = process.env.JWT_PUBLIC_KEY_NAME || 'jwtRS256.key.pub';

const jwtPrivateKey = fs.readFileSync(`${jwtKeysPath}/${jwtPrivateKeyName}`).toString();
const jwtPublicKey = fs.readFileSync(`${jwtKeysPath}/${jwtPublicKeyName}`).toString();

module.exports = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  allowedCorsUrls: ['http://app.triangl.local.io', 'http://localhost:8080'],
  allowedRedirectUris: {
    TRIANGL_WEB_APP: ['http://app.triangl.local.io/callback', 'http://localhost:8080/callback']
  },
  allowedAudiences: {
    TRIANGL_WEB_APP: ['http://api.triangl.local.io/dashboard-service']
  },
  jwtPrivateKey,
  jwtPublicKey,
  jwtLiveSpanInSec: 3600,
  jwtRefreshLiveSpanInSec: 7200,
  db: {
    host: process.env.SQL_HOST || 'localhost',
    user: process.env.SQL_USER || 'root',
    password: process.env.SQL_PASSWORD || 'root',
    database: process.env.SQL_DATABASE || 'auth'
  }
};
