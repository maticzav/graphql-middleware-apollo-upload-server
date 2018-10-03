# graphql-middleware-apollo-upload-server

[![CircleCI](https://circleci.com/gh/homeroom-live/graphql-middleware-apollo-upload-server.svg?style=shield)](https://circleci.com/gh/homeroom-live/graphql-middleware-apollo-upload-server)
[![npm version](https://badge.fury.io/js/graphql-middleware-apollo-upload-server.svg)](https://badge.fury.io/js/graphql-middleware-apollo-upload-server)

GraphQL Middleware Apollo Upload Server manages uploads for you so you don't have to care about them.

> ❗️ Requires [Apollo Upload Server](https://github.com/jaydenseric/apollo-upload-server).

## Install

```bash
yarn add graphql-middleware-apollo-upload-server
```

## Overview

`graphql-middleware-apollo-upload-server` handles file upload for you by searching for all `Upload` types first, and handling the files if they are included in arguments. Everything else is in your hands!

## Features

- 👌 Easy to use.
- 🛴 Half automatic.
- 🏆 Works with every GraphQL server.

## Demo

```ts
import { GraphQLServer } from 'graphql-yoga'
import { S3 } from 'aws-sdk'
import { upload } from 'graphql-middleware-apollo-upload-server'

const client = new S3({
  accessKeyId: __S3_KEY__,
  secretAccessKey: __S3_SECRET__,
  params: { Bucket: __S3_BUCKET__ },
})

const uploadToS3 = async file => {
  const { stream, filename, mimetype, encoding } = file

  const response = await client
    .upload({
      Key: filename,
      ACL: 'public-read',
      Body: file.stream,
    })
    .promise()

  return {
    name: filename,
    url: response.Location
  }
}

const typeDefs = `
  scalar Upload

  type Query {
    me: User
  }

  type Mutation {
    signup(name: String!, password: String!, picture: Upload!): User
  }

  type User {
    id: ID!
    name: String!
    password: String!
    picture: File!
  }

  type File {
    id: ID!
    name: String!
    url: String!
  }
`

const resolvers = {
  Query: {
    me: getMyself
  },
  Mutation: {
    signup: async (parent, { name, password, picture }, ctx, info) => {
      // "picture" has already been uploaded!
      return ctx.db.createUser({
        data: {
          name,
          password,
          picture: picture.url
        }
      })
    }
  }
}

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  middlewares: [upload({ uploadHandler: uploadToS3 })],
  context: req => ({
    ...req,
    db: new Prisma({
      endpoint: __PRISMA_ENDPOINT__,
    })
  })
})

server.listen(() => {
  console.log(`Server running on https://localhost:4000`)
})
```

## API

```ts
export interface IFile {
  stream: string
  filename: string
  mimetype: string
  encoding: string
}

interface IConfig<output> {
  uploadHandler: (file: IFile) => Promise<output>
}

export const upload = <output>(
  config: IConfig<output>,
): IMiddleware
```

## License

MIT @ Homeroom
