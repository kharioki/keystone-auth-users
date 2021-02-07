const { Keystone } = require('@keystonejs/keystone');
const { PasswordAuthStrategy } = require('@keystonejs/auth-password');
const { GraphQLApp } = require('@keystonejs/app-graphql');
const { AdminUIApp } = require('@keystonejs/app-admin-ui');
const { MongooseAdapter } = require('@keystonejs/adapter-mongoose');

const { createItems } = require('@keystonejs/server-side-graphql-client');
const { Text, Checkbox, Password, Relationship } = require('@keystonejs/fields');

const keystone = new Keystone({
  adapter: new MongooseAdapter({ mongoUri: 'mongodb://localhost/keystone-auth' }),
  onConnect: async keystone => {
    // Reset the database each time for this example
    await keystone.adapter.dropDatabase();

    // 1. Insert the user list first to obtain the user IDs
    const users = await createItems({
      keystone,
      listKey: 'User',
      items: [
        {
          data: {
            name: 'Tony Stark',
            email: 'tony@stark.com',
            password: 'avengers',
          },
        },
        {
          data: {
            name: 'Bobo',
            email: 'bobo@stark.com',
            password: 'wambuiii',
          },
        },
      ],
      returnFields: 'id, name',
    });

    // 2. Insert `Post` data, with the required relationships, via `connect` nested mutation.
    await createItems({
      keystone,
      listKey: 'Post',
      items: [
        {
          data: {
            title: 'Hello Kajiado',
            author: {
              // Extracting the id from `users` array
              connect: {
                id: users.find(user => user.name === 'Tony Stark').id,
              },
            },
          },
        },
      ],
    });
  },
});

keystone.createList('User', {
  fields: {
    name: { type: Text },
    email: { type: Text, isUnique: true },
    isAdmin: { type: Checkbox },
    password: { type: Password },
  },
});

keystone.createList('Post', {
  fields: {
    title: { type: Text },
    author: { type: Relationship, ref: 'User', many: false },
  },
});

const authStrategy = keystone.createAuthStrategy({
  type: PasswordAuthStrategy,
  list: 'User',
});

module.exports = {
  keystone,
  apps: [
    new GraphQLApp(),
    new AdminUIApp({ name: 'example-project', enableDefaultRoute: true, authStrategy }),
  ],
};