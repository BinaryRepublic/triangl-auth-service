const { throwMissingParam } = require('../support/ErrorHandler');

class UserLoginDto {
  constructor({
    email,
    password,
  }) {
    this.email = email || throwMissingParam('email');
    this.password = password || throwMissingParam('password');
  }
}

module.exports = UserLoginDto;
