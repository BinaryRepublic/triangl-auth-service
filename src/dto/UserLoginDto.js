const { throwMissingParam } = require('../support/ErrorHandler');

class UserLoginDto {
  constructor({
    email,
    password,
    redirect_uri,
    state,
    response_type,
    session_id
  }) {
    this.email = email || throwMissingParam('email');
    this.password = password || throwMissingParam('password');
    this.redirect_uri = redirect_uri || throwMissingParam('redirect_uri');
    this.state = state || throwMissingParam('state');
    this.response_type = response_type || throwMissingParam('response_type');
    this.session_id = session_id || throwMissingParam('session_id');
  }
}

module.exports = UserLoginDto;
