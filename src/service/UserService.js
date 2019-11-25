const bcrypt = require('bcrypt');
const rand = require('csprng');
const { Base64 } = require('js-base64');

const userRepository = require('../repository/UserRepository');

module.exports = {
  registerUser,
  verifyUserCredentials,
  generateAndStoreAuthorizationCode,
  getUserByAuthorizationCodeAndDropCode,
  constructAuthorizationCodeRedirectUri,
  getUserById
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
  const authorizationCode = Base64.encode(JSON.stringify(authorizationCodeObj));

  await userRepository.storeAuthorizationCode(userId, authorizationCode);
  return authorizationCode;
}

async function getUserByAuthorizationCodeAndDropCode(authorizationCode) {
  verifyAuthorizationCode(authorizationCode);
  const user = await userRepository.getUserByAuthorizationCode(authorizationCode);
  if (user === null) {
    throw { statusCode: 400, message: 'invalid authorization_code' }
  }
  await userRepository.dropAuthorizationCodeForUser(user.id);

  return user;
}

function verifyAuthorizationCode(authorizationCode) {
  const json = Base64.decode(authorizationCode);
  const authorizationCodeObj = JSON.parse(json);
  const { expires } = authorizationCodeObj;

  if (expires < new Date().toISOString()) {
    throw { statusCode: 400, message: 'authorization_code is expired' }
  }
}

function constructAuthorizationCodeRedirectUri(redirect_uri, code, state, response_type) {
  return `${redirect_uri}?code={code}&state={state}&response_type={response_type}`
    .replace('{code}', encodeURIComponent(code))
    .replace('{state}', encodeURIComponent(state))
    .replace('{response_type}', encodeURIComponent(response_type))
}

async function getUserById(id) {
  return await userRepository.getUserById(id);
}
