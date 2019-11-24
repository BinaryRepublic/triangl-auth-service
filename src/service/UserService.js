const bcrypt = require('bcrypt');
const rand = require('csprng');
const base64 = require('js-base64');

const userRepository = require('../repository/UserRepository');

module.exports = {
  registerUser,
  verifyUserCredentials,
  generateAndStoreAuthorizationCode
};

async function registerUser(email, password) {
  const existingUserWithEmail = await userRepository.getUserByEmail(email);
  if (existingUserWithEmail) {
    throw { statusCode: 400, message: 'this email is already in use' }
  }
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  await userRepository.createUser(email, passwordHash);
}

async function verifyUserCredentials(email, password) {
  const user = await userRepository.getUserByEmail(email);
  if (!user) {
    throw { statusCode: 400, message: 'invalid user credentials' };
  }
  if (!bcrypt.compareSync(password, user.password)) {
    throw { statusCode: 400, message: 'invalid user credentials' };
  }
  return user;
}

async function generateAndStoreAuthorizationCode(userId) {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 1);

  const authorizationCodeObj = {
    secret: rand(160, 36),
    expires: expires.toISOString()
  };
  const authorizationCode = base64.encode(JSON.stringify(authorizationCodeObj));

  await userRepository.storeAuthorizationCode(userId, authorizationCode);
}
