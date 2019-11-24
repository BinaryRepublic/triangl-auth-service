const { throwMissingParam } = require('../support/ErrorHandler');

class UserRegisterDto {
  constructor({
    email,
    password,
    password_confirm
  }) {
    if (password !== password_confirm) {
      throw { statusCode: 400, message: 'passwords do not match' };
    }
    this.email = email || throwMissingParam('email');
    this.password = password || throwMissingParam('password');
    this.password_confirm = password_confirm || throwMissingParam('password_confirm');
  }
}

module.exports = UserRegisterDto;
