const uuidv4 = require('uuid/v4');
const knex = require('../support/Knex');

const TABLES = {
  auth: 'auth'
};

module.exports = {
  storeAuthorizationRequest
};

async function storeAuthorizationRequest(code_challenge, code_challenge_method, state) {
  await knex(TABLES.auth).insert({
    id: uuidv4(),
    code_challenge,
    code_challenge_method,
    state
  })
}
