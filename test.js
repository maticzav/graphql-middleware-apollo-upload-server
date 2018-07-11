import test from 'ava'
import { makeExecutableSchema } from 'graphql-tools'
import { applyMiddleware } from 'graphql-middleware'
import { GraphQLUpload } from 'apollo-upload-server'
import { graphql, GraphQLString, GraphQLInteger } from 'graphql'
import {
  filterMapFieldArguments,
  isGraphQLArgumentType,
  uploadTypeIdentifier,
  normaliseArguments,
} from './'

// Helpers

// Tests

test('Finds Argument With Type', async t => {
  t.plan(2)

  // Schema
  const typeDefs = `
    type Query {
      test(string: String, boolean: Boolean!): String!
    }
  `

  const resolvers = {
    Query: {
      test: (parent, args, ctx, infp) => 'pass',
    },
  }

  // Middleware
  const processor = arg => {
    if (isGraphQLArgumentType(GraphQLString, arg)) {
      t.pass()
      return 'pass'
    } else {
      return null
    }
  }

  const middleware = {
    Query: {
      test: async (resolve, parent, args, ctx, info) => {
        filterMapFieldArguments(processor, info, args)

        return resolve()
      },
    },
  }

  // Schema with Middleware
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const schemaWithMiddleware = applyMiddleware(schema, middleware)

  // Execution
  const query = `
    query {
      test(string: "trigger", boolean: true)
    }
  `

  const res = await graphql(schema, query)

  t.is(res.data.test, 'pass')
})

test(`Doesn't find Argument With Type`, async t => {
  t.plan(1)

  // Schema
  const typeDefs = `
    type Query {
      test(b1: Boolean!, b2: Boolean!): String!
    }
  `

  const resolvers = {
    Query: {
      test: (parent, args, ctx, infp) => 'pass',
    },
  }

  // Middleware
  const processor = arg => {
    if (isGraphQLArgumentType(GraphQLString, arg)) {
      t.pass()
      return 'pass'
    } else {
      return null
    }
  }

  const middleware = {
    Query: {
      test: async (resolve, parent, args, ctx, info) => {
        filterMapFieldArguments(processor, info, args)

        return resolve()
      },
    },
  }

  // Schema with Middleware
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const schemaWithMiddleware = applyMiddleware(schema, middleware)

  // Execution
  const query = `
    query {
      test(b1: false, b2: true)
    }
  `

  const res = await graphql(schema, query)

  t.is(res.data.test, 'pass')
})

test('Finds Argument With List Type', async t => {
  t.plan(2)

  // Schema
  const typeDefs = `
    type Query {
      test(strings: [String]!, boolean: Boolean!): String!
    }
  `

  const resolvers = {
    Query: {
      test: (parent, args, ctx, infp) => 'pass',
    },
  }

  // Middleware
  const processor = arg => {
    if (isGraphQLArgumentType(GraphQLString, arg)) {
      t.pass()
      return 'pass'
    } else {
      return null
    }
  }

  const middleware = {
    Query: {
      test: async (resolve, parent, args, ctx, info) => {
        filterMapFieldArguments(processor, info, args)

        return resolve()
      },
    },
  }

  // Schema with Middleware
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const schemaWithMiddleware = applyMiddleware(schema, middleware)

  // Execution
  const query = `
    query {
      test(strings: ["trigger"], boolean: true)
    }
  `

  const res = await graphql(schema, query)

  t.is(res.data.test, 'pass')
})

test('Values in processor match', async t => {
  t.plan(2)

  // Schema
  const typeDefs = `
    type Query {
      test(string: String!): String!
    }
  `

  const resolvers = {
    Query: {
      test: (parent, args, ctx, infp) => 'pass',
    },
  }

  // Middleware
  const processor = (def, value) => {
    t.is(value, 'trigger')
  }

  const middleware = {
    Query: {
      test: async (resolve, parent, args, ctx, info) => {
        filterMapFieldArguments(processor, info, args)

        return resolve()
      },
    },
  }

  // Schema with Middleware
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const schemaWithMiddleware = applyMiddleware(schema, middleware)

  // Execution
  const query = `
    query {
      test(string: "trigger")
    }
  `

  const res = await graphql(schema, query)

  t.is(res.data.test, 'pass')
})

test('Processed values match', async t => {
  t.plan(2)

  // Schema
  const typeDefs = `
    type Query {
      test(string: String!): String!
    }
  `

  const resolvers = {
    Query: {
      test: (parent, args, ctx, infp) => 'pass',
    },
  }

  // Middleware
  const processor = (def, value) => {
    return 'works'
  }

  const middleware = {
    Query: {
      test: async (resolve, parent, args, ctx, info) => {
        const res = filterMapFieldArguments(processor, info, args)
        t.is(res[0], 'works')

        return resolve()
      },
    },
  }

  // Schema with Middleware
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const schemaWithMiddleware = applyMiddleware(schema, middleware)

  // Execution
  const query = `
    query {
      test(string: "trigger")
    }
  `

  const res = await graphql(schema, query)

  t.is(res.data.test, 'pass')
})

test('Is GraphQLUpload type', async t => {
  t.plan(2)

  // Schema
  const typeDefs = `
    scalar Upload

    type Query {
      test(upload: Upload): String!
    }
  `

  const resolvers = {
    Query: {
      test: (parent, args, ctx, infp) => 'pass',
    },
    Upload: GraphQLUpload,
  }

  // Middleware
  const processor = arg => {
    if (isGraphQLArgumentType(GraphQLUpload, arg)) {
      t.pass()
    }

    return null
  }

  const middleware = {
    Query: {
      test: async (resolve, parent, args, ctx, info) => {
        filterMapFieldArguments(processor, info, args)

        return resolve()
      },
    },
  }

  // Schema with Middleware
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const schemaWithMiddleware = applyMiddleware(schema, middleware)

  // Execution
  const query = `
    query {
      test
    }
  `

  const res = await graphql(schema, query)

  t.is(res.data.test, 'pass')
})

test('Is GraphQLUpload List type', async t => {
  t.plan(2)

  // Schema
  const typeDefs = `
    scalar Upload

    type Query {
      test(upload: [Upload]): String!
    }
  `

  const resolvers = {
    Query: {
      test: (parent, args, ctx, infp) => 'pass',
    },
    Upload: GraphQLUpload,
  }

  // Middleware
  const processor = arg => {
    if (isGraphQLArgumentType(GraphQLUpload, arg)) {
      t.pass()
    }

    return null
  }

  const middleware = {
    Query: {
      test: async (resolve, parent, args, ctx, info) => {
        filterMapFieldArguments(processor, info, args)

        return resolve()
      },
    },
  }

  // Schema with Middleware
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const schemaWithMiddleware = applyMiddleware(schema, middleware)

  // Execution
  const query = `
    query {
      test
    }
  `

  const res = await graphql(schema, query)

  t.is(res.data.test, 'pass')
})

test('Identifies GraphQLUpload type correctly', async t => {
  t.plan(2)

  // Schema
  const typeDefs = `
    scalar Upload

    type Query {
      test(pass: [Upload]): String!
    }
  `

  const resolvers = {
    Query: {
      test: (parent, args, ctx, infp) => 'pass',
    },
    Upload: GraphQLUpload,
  }

  // Middleware

  const middleware = {
    Query: {
      test: async (resolve, parent, args, ctx, info) => {
        const res = filterMapFieldArguments(uploadTypeIdentifier, info, args)
        t.deepEqual(res[0], {
          argumentName: 'pass',
          upload: undefined,
        })

        return resolve()
      },
    },
  }

  // Schema with Middleware
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const schemaWithMiddleware = applyMiddleware(schema, middleware)

  // Execution
  const query = `
    query {
      test
    }
  `

  const res = await graphql(schema, query)

  t.is(res.data.test, 'pass')
})

test('Normalizes response correctly', async t => {
  const res = normaliseArguments([
    { argumentName: 'arg1', upload: { value: 'x' } },
    { argumentName: 'arg2', upload: { value: 'z' } },
  ])

  t.deepEqual(res, {
    arg1: { value: 'x' },
    arg2: { value: 'z' },
  })
})
