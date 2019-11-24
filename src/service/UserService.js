const bcrypt = require('bcrypt');
const rand = require('csprng');
const base64 = require('js-base64');

const userRepository = require('../repository/UserRepository');

module.exports = {
  verifyUserCredentials,
  generateAndStoreAuthorizationCode
};

async function verifyUserCredentials(email, password) {
  const userCredentials = userRepository.getUserCredentialsByEmail(email);
  if (!userCredentials) {
    throw { statusCode: 400, message: 'invalid user credentials' };
  }
  if (!bcrypt.compareSync(password, userCredentials.password)) {
    throw { statusCode: 400, message: 'invalid user credentials' };
  }
  return userCredentials;
}

async function generateAndStoreAuthorizationCode(userCredentialId) {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 1);

  const authorizationCodeObj = {
    secret: rand(160, 36),
    expires: expires.toISOString()
  };
  const authorizationCode = base64.encode(JSON.stringify(authorizationCodeObj));

  await userRepository.storeAuthorizationCode(userCredentialId, authorizationCode);
}
