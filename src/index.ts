import { IMiddleware } from 'graphql-middleware'
import { GraphQLUpload } from 'apollo-upload-server'
import { GraphQLResolveInfo, GraphQLArgument, GraphQLField } from 'graphql'

// GraphQL

type Maybe<T> = T | null

function getResolverField(
  info: GraphQLResolveInfo,
): GraphQLField<any, any, { [key: string]: any }> {
  const { fieldName, parentType } = info
  const typeFields = parentType.getFields()

  return typeFields[fieldName]
}

function getFieldArguments<TSource, TContext, TArgs>(
  field: GraphQLField<TSource, TContext, TArgs>,
): GraphQLArgument[] {
  return field.args
}

function filterMap<T, U>(f: (x: T) => Maybe<U>, xs: T[]): U[] {
  return xs.reduce((acc, x) => {
    const res = f(x)
    if (res !== null) {
      return [res, ...acc]
    } else {
      return acc
    }
  }, [])
}

function getArgumentValue(args: { [key: string]: any }, arg: GraphQLArgument) {
  return args.get(arg.name)
}

export function executeWithArgumentType<T>(
  f: (definition: GraphQLArgument, arg: any) => Maybe<T>,
  info: GraphQLResolveInfo,
  args: { [key: string]: any },
): T[] {
  const field = getResolverField(info)
  const fieldArguments = getFieldArguments(field)

  const fWithArguments = arg => f(arg, getArgumentValue(args, arg))

  return filterMap(fWithArguments, fieldArguments)
}

// Upload

export interface IUpload {
  stream: string
  filename: string
  mimetype: string
  encoding: string
}

declare type IUploadHandler<T> = (upload: Promise<IUpload>) => Promise<T>

interface IConfig<T> {
  uploadHandler: IUploadHandler<T>
}

function isGraphQLUploadArgument(
  x: GraphQLArgument,
): x is GraphQLArgument & { type: GraphQLUpload } {
  return x.type instanceof GraphQLUpload
}

// function processor<T>

async function processor<T>(uploadFunction: IUploadHandler<T>) {
  return async (def, value) => {
    if (isGraphQLUploadArgument(def)) {
      return (value as Promise<IUpload>).then(uploadFunction)
    } else {
      return null
    }
  }
}

export function upload<T>({ uploadHandler }: IConfig<T>): IMiddleware {
  return (resolve, parent, args, ctx, info) => {
    const executed = executeWithArgumentType(uploadHandler, info)

    return resolve()
  }
}
