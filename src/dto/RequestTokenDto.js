const { throwMissingParam } = require('../support/ErrorHandler');

class RequestTokenDto {
  constructor({
    authorization_code,
    code_verifier,
    response_type
  }) {
    this.authorization_code = authorization_code || throwMissingParam('authorization_code');
    this.code_verifier = code_verifier || throwMissingParam('code_verifier');
    this.response_type = response_type || throwMissingParam('response_type');
  }
}

module.exports = RequestTokenDto;
