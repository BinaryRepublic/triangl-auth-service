const { throwMissingParam } = require('../support/ErrorHandler');

class RevokeTokenDto {
  constructor({
    token,
    token_type_hint
  }) {
    this.token = token || throwMissingParam('token');
    this.token_type_hint = token_type_hint || throwMissingParam('token_type_hint');
  }
}

module.exports = RevokeTokenDto;
