const express = require('express');
const router = express.Router();
const { withErrorHandler } = require('../support/ErrorHandler');

const AuthorizeDto = require('../dto/AuthorizeDto');
const {
  storeCodeChallenge,
  constructRedirectUri
} = require('../service/AuthService');

router.get('/authorize', withErrorHandler(async (req, res) => {
  const authorizeDto = new AuthorizeDto(req.query);
  const {
    code_challenge,
    code_challenge_method,
    state,
    response_type,
    redirect_uri
  } = authorizeDto;

  await storeCodeChallenge(
    code_challenge,
    code_challenge_method,
    state
  );
  const redirectUri = constructRedirectUri(
    state,
    response_type,
    redirect_uri,
    code_challenge
  );

  res.redirect(redirectUri);
}));

router.get('/token', withErrorHandler((req, res) => {
  res.send();
}));

module.exports = router;
