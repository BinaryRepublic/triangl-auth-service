const express = require('express');
const router = express.Router();
const { withErrorHandler } = require('../support/ErrorHandler');

const authConfig = require('../config/AuthConfig');
const AuthorizeDto = require('../dto/AuthorizeDto');
const RequestTokenDto = require('../dto/RequestTokenDto');
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

router.get('/token', withErrorHandler(async (req, res) => {
  const requestTokenDto = new RequestTokenDto(req.query);

  const user = await userService.getUserByAuthorizationCodeAndDropCode(requestTokenDto.authorization_code);
  const tokens = await authService.checkCodeVerifierAndGenerateTokensForUser(
    user,
    requestTokenDto.code_verifier,
    requestTokenDto.response_type
  );

  res.send(tokens);
}));

router.get('/.well-known/jwks.json', withErrorHandler((req, res) => {
  res.send(authConfig.jwtPublicKey);
}));

module.exports = router;
