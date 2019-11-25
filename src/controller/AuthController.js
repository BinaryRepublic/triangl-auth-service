const express = require('express');
const router = express.Router();
const { withErrorHandler } = require('../support/ErrorHandler');

const authConfig = require('../config/AuthConfig');
const AuthorizeDto = require('../dto/AuthorizeDto');
const RequestTokenDto = require('../dto/RequestTokenDto');
const RevokeTokenDto = require('../dto/RevokeTokenDto');
const authService = require('../service/AuthService');
const userService = require('../service/UserService');

router.get('/authorize', withErrorHandler(async (req, res) => {
  const authorizeDto = new AuthorizeDto(req.query);
  const {
    code_challenge,
    code_challenge_method,
    state,
    response_type,
    redirect_uri,
    audience,
    client_id
  } = authorizeDto;

  const authSessionId = await authService.createAuthSession(
    code_challenge,
    code_challenge_method,
    audience,
    client_id
  );

  res.redirect(authService.constructUserLoginRedirectUri(
    state,
    response_type,
    redirect_uri,
    authSessionId
  ));
}));

router.post('/token', withErrorHandler(async (req, res) => {
  const requestTokenDto = new RequestTokenDto(req.body);

  switch (requestTokenDto.grant_type) {
    case 'authorization_code':
      const user = await userService.getUserByAuthorizationCodeAndDropCode(requestTokenDto.code);
      const initialTokens = await authService.checkCodeVerifierAndGenerateTokensForUser(
        user,
        requestTokenDto.code_verifier,
        requestTokenDto.response_type
      );
      res.send(initialTokens);
    break;
    case 'refresh_token':
      const refreshedTokens = await authService.checkRefreshTokenAndGenerateTokensForUser(requestTokenDto.refresh_token, requestTokenDto.response_type);
      res.send(refreshedTokens);
    break;
    default:
      throw { statusCode: 400, message: 'grant_type not supported' }
  }
}));

router.post('/token/revoke', withErrorHandler(async (req, res) => {
  const revokeTokenDto = new RevokeTokenDto(req.body);

  switch (revokeTokenDto.token_type_hint) {
    case 'access_token':
      await authService.dropAccessTokenForUser(revokeTokenDto.token);
    break;
    case 'refresh_token':
      await authService.dropRefreshTokenForUser(revokeTokenDto.token);
    break;
    default:
      throw { statusCode: 400, message: 'token_type_hint not a valid token name' }
  }
  res.send()
}));

router.get('/.well-known/jwks.json', withErrorHandler((req, res) => {
  res.send(authConfig.jwtPublicKey);
}));

module.exports = router;
