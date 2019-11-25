const uuidv4 = require('uuid/v4');
const knex = require('../support/Knex');

const TABLES = {
  auth: 'auth'
};

module.exports = {
  createAuthSession,
  setUserId,
  getPendingAuthSessionByUserId,
  getAuthSessionByRefreshToken,
  saveTokens,
  dropAccessToken,
  dropRefreshToken
};

async function createAuthSession(code_challenge, code_challenge_method, audience, client_id) {
  const id = uuidv4();
  await knex(TABLES.auth).insert({
    id,
    code_challenge,
    code_challenge_method,
    audience,
    client_id
  });
  return id;
}

async function setUserId(id, user_id) {
  await knex(TABLES.auth)
    .where('id', id)
    .update({
      user_id
    })
}

async function getPendingAuthSessionByUserId(user_id) {
  const authSession = await knex(TABLES.auth)
    .select('id', 'code_challenge', 'code_challenge_method', 'client_id', 'audience')
    .where('user_id', user_id)
    .orderBy('created_at', 'desc');
  return authSession[0] || null;
}

async function getAuthSessionByRefreshToken(refresh_token) {
  const authSession = await knex(TABLES.auth)
    .select('id', 'client_id', 'audience', 'user_id')
    .where('refresh_token', refresh_token)
    .orderBy('created_at', 'desc');
  return authSession[0] || null;
}

async function saveTokens(id, access_token, refresh_token) {
  await knex(TABLES.auth)
    .where('id', id)
    .update({
      access_token,
      refresh_token
    })
}

async function dropAccessToken(access_token) {
  await knex(TABLES.auth)
    .where('access_token', access_token)
    .update({
      access_token: null
    })
}
async function dropRefreshToken(refresh_token) {
  await knex(TABLES.auth)
    .where('refresh_token', refresh_token)
    .update({
      refresh_token: null
    })
}
