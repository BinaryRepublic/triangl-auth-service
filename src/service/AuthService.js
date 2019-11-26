const sha256 = require('s256');
const { Base64 } = require('js-base64');
const jsonwebtoken = require('jsonwebtoken');

const authConfig = require('../config/AuthConfig');
const authRepository = require('../repository/AuthRepository');
const userRepository = require('../repository/UserRepository');

module.exports = {
  validateResponseType,
  validateRedirectUriForClient,
  validateAudienceForClient,
  createAuthSession,
  constructUserLoginRedirectUri,
  linkAuthSessionWithUser,
  checkCodeVerifierAndGenerateTokensForUser,
  checkRefreshTokenAndGenerateTokensForUser,
  dropAccessTokenForUser,
  dropRefreshTokenForUser,
  getUserIdByAccessToken
};

const RESPONSE_TYPES = ['token id_token'];
const CODE_CHALLENGE_METHODS = {
  S256: 'S256'
};
const SUPPORTED_CODE_CHALLENGE_METHODS = [CODE_CHALLENGE_METHODS.S256];

function validateResponseType(response_type) {
  return RESPONSE_TYPES.includes(response_type);
}

function validateRedirectUriForClient(client_id, redirect_uri) {
  return authConfig.allowedRedirectUris[client_id].includes(redirect_uri);
}

function validateAudienceForClient(client_id, audience) {
  return authConfig.allowedAudiences[client_id].includes(audience);
}

async function createAuthSession(code_challenge, code_challenge_method, audience, client_id) {
  if (!SUPPORTED_CODE_CHALLENGE_METHODS.includes(code_challenge_method)) {
    throw { statusCode: 400, message: 'unsupported code_challenge_method - please use S256' }
  }
  return await authRepository.createAuthSession(code_challenge, code_challenge_method, audience, client_id)
}

async function linkAuthSessionWithUser(id, userId) {
  await authRepository.setUserId(id, userId);
}

function constructUserLoginRedirectUri(state, response_type, redirect_uri, session_id) {
  return `${authConfig.baseUrl}/login?state={state}&response_type={response_type}&redirect_uri={redirect_uri}&session_id={session_id}`
    .replace('{state}', encodeURIComponent(state))
    .replace('{response_type}', encodeURIComponent(response_type))
    .replace('{redirect_uri}', encodeURIComponent(redirect_uri))
    .replace('{session_id}', encodeURIComponent(session_id))
}

async function checkCodeVerifierAndGenerateTokensForUser(user, code_verifier, response_type) {
  const authSession = await authRepository.getPendingAuthSessionByUserId(user.id);
  verifyCodeChallenge(authSession.code_challenge_method, authSession.code_challenge, code_verifier);

  return await generateFreshTokenResponseForUser(user, authSession, response_type)
}

async function checkRefreshTokenAndGenerateTokensForUser(refresh_token, response_type) {
  const authSession = await authRepository.getAuthSessionByRefreshToken(refresh_token);
  if (!authSession) {
    throw { statusCode: 400, message: 'refresh_token is invalid' }
  }
  const user = await userRepository.getUserById(authSession.user_id);

  return await generateFreshTokenResponseForUser(user, authSession, response_type);
}

async function generateFreshTokenResponseForUser(user, authSession, response_type) {
  const algorithm = 'RS256';
  const access_token = jsonwebtoken.sign(
    {
      user_id: user.id
    },
    authConfig.jwtPrivateKey,
    {
      issuer: authConfig.baseUrl,
      expiresIn: authConfig.jwtLiveSpanInSec,
      audience: authSession.audience,
      algorithm
    }
  );
  const refresh_token = jsonwebtoken.sign({}, authConfig.jwtPrivateKey, { expiresIn: authConfig.jwtRefreshLiveSpanInSec, algorithm });
  const id_token = jsonwebtoken.sign(
    {
      user_id: user.id,
      email: user.email
    },
    authConfig.jwtPrivateKey,
    {
      issuer: authConfig.baseUrl,
      subject: user.id,
      audience: authSession.client_id,
      expiresIn: authConfig.jwtLiveSpanInSec,
      algorithm
    }
  );

  await authRepository.saveTokens(authSession.id, access_token, refresh_token);

  if (response_type === 'token id_token') {
    return {
      access_token,
      refresh_token,
      token_type : 'bearer',
      expires_in : authConfig.jwtLiveSpanInSec,
      scope : '',
      id_token
    }
  }
  throw { statusCode: 400, message: 'response_type not support, use "token id_token"' }
}

function verifyCodeChallenge(code_challenge_method, code_challenge, code_verifier) {
  if (code_challenge_method === CODE_CHALLENGE_METHODS.S256) {
    if (Base64.encode(sha256(code_verifier)) !== code_challenge) {
      throw { statusCode: 400, message: 'code_challenge could not be verified' };
    }
    return true;
  }
  throw { statusCode: 400, message: 'code_challenge_method not supported' };
}

async function dropAccessTokenForUser(access_token) {
  await authRepository.dropAccessToken(access_token);
}

async function dropRefreshTokenForUser(refresh_token) {
  await authRepository.dropRefreshToken(refresh_token);
}

async function getUserIdByAccessToken(access_token) {
  const authSession = await authRepository.getAuthSessionByAccessToken(access_token);
  if (!authSession) {
    throw { statusCode: 401, message: 'not authenticated' }
  }
  return authSession.user_id;
}
