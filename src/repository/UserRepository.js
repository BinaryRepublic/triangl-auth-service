const uuidv4 = require('uuid/v4');
const knex = require('../support/Knex');

const TABLES = {
  user: 'user'
};

module.exports = {
  createUser,
  getUserByEmail,
  storeAuthorizationCode
};

async function createUser(email, password) {
  await knex(TABLES.user).insert({
    id: uuidv4(),
    email,
    password
  })
}

async function getUserByEmail(email) {
  const users = await knex(TABLES.user)
    .select('id', 'email', 'password')
    .where('email', email);
  return users[0] || null;
}

async function storeAuthorizationCode(userId, authorization_code) {
  await knex(TABLES.user)
    .where('id', userId)
    .update({
      authorization_code
    })
}
