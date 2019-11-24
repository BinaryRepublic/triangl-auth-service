const AuthService = require('../service/AuthService');
const { throwMissingParam } = require('../support/ErrorHandler');

class AuthorizeDto {
  constructor({
    response_type,
    state,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    audience,
    client_id
  }) {
    this.response_type = response_type || throwMissingParam('response_type');
    this.state = state || throwMissingParam('state');
    this.redirect_uri = redirect_uri || throwMissingParam('redirect_uri');
    this.code_challenge = code_challenge || throwMissingParam('code_challenge');
    this.code_challenge_method = code_challenge_method || throwMissingParam('code_challenge_method');
    this.audience = audience || throwMissingParam('audience');
    this.client_id = client_id || throwMissingParam('client_id');

    if (!AuthService.validateResponseType(response_type)) {
      throw { statusCode: 400, message: 'response_type invalid' };
    }
    if (!AuthService.validateRedirectUriForClient(client_id, redirect_uri)) {
      throw { statusCode: 400, message: 'redirect_uri not allowed' };
    }
    if (!AuthService.validateAudienceForClient(client_id, audience)) {
      throw { statusCode: 400, message: 'this client cannot request access to this audience' }
    }
  }
}

module.exports = AuthorizeDto;
