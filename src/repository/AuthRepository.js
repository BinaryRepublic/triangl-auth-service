const knex = require('../support/Knex');

const TABLES = {
  user_credential: 'user_credential'
};

module.exports = {
  storeAuthorizationRequest
};

async function storeAuthorizationRequest(code_challenge, code_challenge_method, state) {
  await knex(TABLES.user_credential).insert({
    code_challenge,
    code_challenge_method,
    state
  })
}
