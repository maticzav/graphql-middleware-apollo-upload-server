import test from 'ava'
import { GraphQLUpload } from 'apollo-upload-server'
import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import { applyMiddleware } from 'graphql-middleware'
import { upload } from './'

test('Finds the right arguments', async t => {
  const typeDefs = `
    scalar Upload

    type Query {
      foo: String
    }

    type Mutation {
      test(nonUpload: String!, upload: Upload!): Boolean
    }
  `

  const resolvers = {
    Query: {
      foo: () => '',
    },
    Mutation: {
      test: async (parent, args, ctx, info) => {
        t.is(args.upload, 'passes')
        t.is(args.nonUpload, 'passes')
      },
    },
    Upload: GraphQLUpload,
  }

  const uploadFunction = async file => {
    return 'passes'
  }

  const _schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  })

  const schema = applyMiddleware(
    _schema,
    upload({ uploadHandler: uploadFunction }),
  )

  const query = `
    mutation {
      test(nonUpload: "passes", upload: "fails")
    }
  `

  const res = await graphql(schema, query)

  console.log(res)
})
