import {
  GraphQLResolveInfo,
  GraphQLArgument,
  GraphQLField,
  getNamedType,
} from 'graphql'
import { GraphQLUpload } from 'apollo-upload-server'
import { IMiddlewareFunction } from 'graphql-middleware'

// GraphQL -------------------------------------------------------------------

type Maybe<T> = T | null

/**
 *
 * @param info
 *
 * Returns GraphQLField type of the current resolver.
 *
 */
function getResolverField(
  info: GraphQLResolveInfo,
): GraphQLField<any, any, { [key: string]: any }> {
  const { fieldName, parentType } = info
  const typeFields = parentType.getFields()

  return typeFields[fieldName]
}

/**
 *
 * @param field
 *
 * Returns arguments that certain field accepts.
 *
 */
function getFieldArguments<TSource, TContext, TArgs>(
  field: GraphQLField<TSource, TContext, TArgs>,
): GraphQLArgument[] {
  return field.args
}

/**
 *
 * @param f
 * @param xs
 *
 * Maps an array of functions and filters out the values
 * which converted to null.
 *
 */
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

/**
 *
 * @param args
 * @param arg
 *
 * Finds the value of argument from provided argument values and
 * argument definition.
 *
 */
function getArgumentValue(args: { [key: string]: any }, arg: GraphQLArgument) {
  return args.get(arg.name)
}

/**
 *
 * @param f
 * @param info
 * @param args
 *
 * Executes a funcition on all arguments of a particular field
 * and filters out the results which returned null.
 *
 */
export function filterMapFieldArguments<T>(
  f: (definition: GraphQLArgument, arg: any) => Maybe<T>,
  info: GraphQLResolveInfo,
  args: { [key: string]: any },
): T[] {
  const field = getResolverField(info)
  const fieldArguments = getFieldArguments(field)

  const fWithArguments = arg => f(arg, getArgumentValue(args, arg))

  return filterMap(fWithArguments, fieldArguments)
}

/**
 *
 * @param type
 * @param x
 *
 * Checks whether a certain non-nullable, list or regular type
 * is of predicted type.
 *
 */
export function isGraphQLArgumentType(
  type,
  argument: GraphQLArgument,
): boolean {
  return getNamedType(argument.type) instanceof type
}

// Upload --------------------------------------------------------------------

export interface IUpload {
  stream: string
  filename: string
  mimetype: string
  encoding: string
}

interface IUploadArgument {
  argumentName: string
  upload: Promise<IUpload> | Promise<IUpload>[]
}

interface IProcessedUploadArgument<T> {
  argumentName: string
  upload: T | T[]
}

declare type IUploadHandler<T> = (upload: IUpload) => Promise<T>

interface IConfig<T> {
  uploadHandler: IUploadHandler<T>
}

/**
 *
 * @param def
 * @param value
 *
 * Funciton used to identify GraphQLUpload arguments.
 *
 */
function uploadTypeIdentifier(
  def: GraphQLArgument,
  value: any,
): IUploadArgument {
  if (isGraphQLArgumentType(GraphQLUpload, def)) {
    return {
      argumentName: def.name,
      upload: value,
    }
  } else {
    return null
  }
}

/**
 *
 * @param args
 * @param info
 *
 * Function used to extract GraphQLUpload argumetns from a field.
 *
 */
function extractUploadArguments(
  args: { [key: string]: any },
  info: GraphQLResolveInfo,
): IUploadArgument[] {
  return filterMapFieldArguments(uploadTypeIdentifier, info, args)
}

/**
 *
 * @param arr
 *
 * Converts an array of processed uploads to one object which can
 * be later used as arguments definition.
 *
 */
function normaliseArguments<T>(
  args: IProcessedUploadArgument<T>[],
): { [key: string]: T } {
  return args.reduce((acc, val) => {
    return {
      ...acc,
      [val.argumentName]: val.upload,
    }
  }, {})
}

/**
 *
 * @param uploadHandler
 *
 * Function used to process file uploads.
 *
 */
function processor<T>(uploadHandler: IUploadHandler<T>) {
  return function({
    argumentName,
    upload,
  }: IUploadArgument): Maybe<Promise<IProcessedUploadArgument<T>>> {
    if (Array.isArray(upload)) {
      const uploads = upload.map(file => file.then(uploadHandler))

      return Promise.all(uploads).then(res => ({
        argumentName: argumentName,
        upload: res,
      }))
    } else if (upload !== undefined) {
      return upload.then(uploadHandler).then(res => ({
        argumentName: argumentName,
        upload: res,
      }))
    } else {
      return null
    }
  }
}

/**
 *
 * @param config
 *
 * Exposed upload function which handles file upload in resolvers.
 * Internally, it returns a middleware function which is later processed
 * by GraphQL Middleware.
 * The first step is to extract upload arguments using identifier
 * which can be found above.
 * Once we found all the GraphQLUpload arguments we check whether they
 * carry a value or not and return a Promise to resolve them.
 * Once Promises get processed we normalise outputs and merge them
 * with old arguments to replace the old values with the new ones.
 *
 */
export function upload<T>({ uploadHandler }: IConfig<T>): IMiddlewareFunction {
  return async (resolve, parent, args, ctx, info) => {
    const files = extractUploadArguments(args, info)
    const uploads = filterMap(processor(uploadHandler), files)

    const uploaded = await Promise.all(uploads)
    const argsUploaded = normaliseArguments(uploaded)

    const argsWithUploads = { ...args, ...argsUploaded }

    return resolve(parent, argsWithUploads, ctx, info)
  }
}
