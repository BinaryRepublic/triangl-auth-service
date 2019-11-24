const authConfig = require('../config/AuthConfig');
const authRepository = require('../repository/AuthRepository');

module.exports = {
  validateRedirectUri,
  storeCodeChallenge,
  validateResponseType,
  constructRedirectUri
};

const RESPONSE_TYPES = ['code id_token'];
const CODE_CHALLENGE_METHODS = ['S256'];

function validateResponseType(response_type) {
  return RESPONSE_TYPES.includes(response_type);
}

function validateRedirectUri(redirect_uri) {
  return authConfig.allowedRedirectUris.includes(redirect_uri);
}

async function storeCodeChallenge(code_challenge, code_challenge_method, state) {
  if (!CODE_CHALLENGE_METHODS.includes(code_challenge_method)) {
    throw { statusCode: 400, message: 'unsupported code_challenge_method - please use S256' }
  }
  await authRepository.storeAuthorizationRequest(code_challenge, code_challenge_method, state)
}

function constructRedirectUri(state, response_type, redirect_uri, code_challenge) {
  return `${authConfig.baseUrl}/login?state={state}&response_type={response_type}&redirect_uri={redirect_uri}&code_challenge={code_challenge}`
    .replace('{state}', encodeURIComponent(state))
    .replace('{response_type}', encodeURIComponent(response_type))
    .replace('{redirect_uri}', encodeURIComponent(redirect_uri))
    .replace('{code_challenge}', encodeURIComponent(code_challenge))
}

async function storeUserIdAndAuthorizationCode(user_id, authorization_code) {
  await authRepository.storeUserIdAndAuthorizationCode(user_id, authorization_code);
}
