const knex = require('../support/Knex');

const TABLES = {
  user: 'user'
};

module.exports = {
  getUserCredentialsByEmail,
  storeAuthorizationCode
};

function getUserCredentialsByEmail(email) {
  return knex
    .select('id', 'email', 'password')
    .from(TABLES.user)
    .where('email', email)
}

async function storeAuthorizationCode(userCredentialId, authorization_code) {
  await knex(TABLES.user)
    .where('id', userCredentialId)
    .update({
      authorization_code
    })
}
