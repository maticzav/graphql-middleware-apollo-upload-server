import { IMiddleware } from 'graphql-middleware'
import { GraphQLUpload } from 'apollo-upload-server'
import { GraphQLResolveInfo } from 'graphql'

interface IConfig<output> {
  uploadHandler: (file: IFile) => Promise<output>
}

export interface IFile {
  stream: string
  filename: string
  mimetype: string
  encoding: string
}

function getUploadArgumentsNames(info: GraphQLResolveInfo): string[] {
  const typeFields = info.parentType.getFields()
  const args = typeFields[info.fieldName].args
  const uploadArgs = args.filter(arg => arg.type === GraphQLUpload)

  return uploadArgs.map(arg => arg.name)
}

export const upload = <output>(config: IConfig<output>): IMiddleware => {
  return async (resolve, parent, args, ctx, info) => {
    const uploadArgumentsNames = getUploadArgumentsNames(info)
    const nonEmptyUploadArgumentsNames = uploadArgumentsNames.filter(
      argName => args[argName] !== undefined,
    )

    const uploads = await Promise.all(
      nonEmptyUploadArgumentsNames.map(uploadArgumentName =>
        args[uploadArgumentName]
          .then(config.uploadHandler)
          .then(res => ({ [uploadArgumentName]: res })),
      ),
    )

    const normalizedUploads = uploads.reduce(
      (args, arg) => ({ ...args, ...arg }),
      {},
    )

    const argsWithUploads = {
      ...args,
      ...normalizedUploads,
    }

    return resolve(parent, argsWithUploads, ctx, info)
  }
}
