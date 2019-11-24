module.exports = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  allowedRedirectUris: ['http://localhost:8080/callback', 'http://localhost:8081/callback'],
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
  jwtPublicKey: process.env.JWT_PUBLIC_KEY,
  db: {
    host: process.env.SQL_HOST || 'localhost',
    user: process.env.SQL_USER || 'root',
    password: process.env.SQL_PASSWORD || 'root',
    database: process.env.SQL_DATABASE || 'auth_prod',
    socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME || 'triangl:europe-west3:analyzing'}`
  }
};
