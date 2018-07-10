import test from 'ava'
import { graphql, GraphQLString, GraphQLInteger } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import { applyMiddleware } from 'graphql-middleware'
import { executeWithArgumentType } from './'

// Helpers

const isStringType = x => {
  return x.type instanceof GraphQLString
}

// Tests

test('Finds Argument With Type - Triggers', async t => {
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
    if (isStringType(arg)) {
      t.pass()
      return 'pass'
    } else {
      return null
    }
  }

  const middleware = {
    Query: {
      test: async (resolve, parent, args, ctx, info) => {
        executeWithArgumentType(processor, info, args)

        return resolve()
      },
    },
  }

  // Schema with Middleware
  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const schemaWithMiddleware = applyMiddleware(schema, middleware)

  const query = `
    query {
      test(string: "trigger", boolean: true)
    }
  `

  const res = await graphql(schema, query)

  t.is(res.data.test, 'pass')
})

test.todo('Finds Argument With Type - Does not trigger')
test.todo('Finds Argument With Type - values in processor match')
test.todo('Finds Argument With Type - values in resolver match')
test.todo('Is GraphQLUpload type')
test.todo('Is not GraphQLUpload type')
test.todo('Is GraphQLUpload List type')
test.todo('Is not GraphQLUpload List type')
