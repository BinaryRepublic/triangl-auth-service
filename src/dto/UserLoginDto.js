const { throwMissingParam } = require('../support/ErrorHandler');

class UserLoginDto {
  constructor({
    email,
    password,
    redirect_uri,
    state
  }) {
    this.email = email || throwMissingParam('email');
    this.password = password || throwMissingParam('password');
    this.redirect_uri = redirect_uri || throwMissingParam('redirect_uri');
    this.state = state || throwMissingParam('state');
  }
}

module.exports = UserLoginDto;
