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

    // 1. Create posts first as we need generated ids to establish relationship with user items.
    const posts = await createItems({
      keystone,
      listKey: 'Post',
      items: [
        { data: { title: 'Hello Kajiado' } },
        { data: { title: 'Talking about React' } },
        { data: { title: 'React is the Best' } },
        { data: { title: 'Kajiado Rocks' } },
      ],
      returnFields: 'id, title',
    });

    // 2. Insert User data with required relationship via nested mutations. `connect` requires an array of post item ids.
    await createItems({
      keystone,
      listKey: 'User',
      items: [
        {
          data: {
            name: 'Tony Stark Duck',
            email: 'tony@stark.com',
            password: 'avengers',
            posts: {
              // Filtering list of items where title contains the word `React`
              connect: posts
                .filter(post => /\bReact\b/i.test(post.title))
                .map(post => ({ id: post.id })),
            },
          },
        },
        {
          data: {
            name: 'Bobo',
            email: 'bobo@stark.com',
            password: 'dolphins',
            isAdmin: true,
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
    posts: { type: Relationship, ref: 'Post.author', many: true },
  },
});

keystone.createList('Post', {
  fields: {
    title: { type: Text },
    author: { type: Relationship, ref: 'User.posts', many: false },
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