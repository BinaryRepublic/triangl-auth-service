const { throwMissingParam } = require('../support/ErrorHandler');

class RequestTokenDto {
  constructor({
    grant_type,
    code,
    code_verifier,
    response_type,
    refresh_token
  }) {
    this.grant_type = grant_type || throwMissingParam('grant_type');
    if (grant_type === 'authorization_code') {
      this.code = code || throwMissingParam('code');
      this.code_verifier = code_verifier || throwMissingParam('code_verifier');
    } else if (grant_type === 'refresh_token') {
      this.refresh_token = refresh_token || throwMissingParam('refresh_token');
    }
    this.response_type = response_type || throwMissingParam('response_type');
  }
}

module.exports = RequestTokenDto;
