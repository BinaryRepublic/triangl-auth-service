const fs = require('fs');

const jwtKeysPath = process.env.JWT_KEYS_PATH || `${__dirname}/../../jwtKeys`;
const jwtPrivateKeyName = process.env.JWT_PRIVATE_KEY_NAME || 'jwtRS256.key';
const jwtPublicKeyName = process.env.JWT_PUBLIC_KEY_NAME || 'jwtRS256.key.pub';

const jwtPrivateKey = fs.readFileSync(`${jwtKeysPath}/${jwtPrivateKeyName}`).toString();
const jwtPublicKey = fs.readFileSync(`${jwtKeysPath}/${jwtPublicKeyName}`).toString();

module.exports = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  allowedCorsUrls: ['http://localhost:8080'],
  allowedRedirectUris: {
    TRIANGL_WEB_APP: ['http://localhost:8080/callback']
  },
  allowedAudiences: {
    TRIANGL_WEB_APP: ['https://api.triangl.io/dashboard-service']
  },
  jwtPrivateKey,
  jwtPublicKey,
  jwtLiveSpanInSec: 3600,
  jwtRefreshLiveSpanInSec: 7200,
  db: {
    host: process.env.SQL_HOST || 'localhost',
    user: process.env.SQL_USER || 'root',
    password: process.env.SQL_PASSWORD || 'root',
    database: process.env.SQL_DATABASE || 'auth_prod',
    socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME || 'triangl:europe-west3:analyzing'}`
  }
};
