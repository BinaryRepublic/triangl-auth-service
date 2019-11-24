const AuthService = require('../service/AuthService');
const { throwMissingParam } = require('../support/ErrorHandler');

class AuthorizeDto {
  constructor({
    response_type,
    state,
    redirect_uri,
    code_challenge,
    code_challenge_method
  }) {
    if (!AuthService.validateResponseType(response_type)) {
      throw { statusCode: 400, message: 'response_type invalid' };
    }
    if (!AuthService.validateRedirectUri(redirect_uri)) {
      throw { statusCode: 400, message: 'redirect_uri not allowed' };
    }
    this.response_type = response_type || throwMissingParam('response_type');
    this.state = state || throwMissingParam('state');
    this.redirect_uri = redirect_uri || throwMissingParam('redirect_uri');
    this.code_challenge = code_challenge || throwMissingParam('code_challenge');
    this.code_challenge_method = code_challenge_method || throwMissingParam('code_challenge_method');
  }
}

module.exports = AuthorizeDto;
