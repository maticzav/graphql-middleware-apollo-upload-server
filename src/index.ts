import { IMiddleware } from 'graphql-middleware'
import { GraphQLUpload } from 'apollo-upload-server'
import { GraphQLResolveInfo, visit } from 'graphql'

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
  const field = typeFields[info.fieldName]
  const args = field.args.filter(arg => arg.type === GraphQLUpload)

  return args.map(arg => arg.name)
}

export const upload = <output>(config: IConfig<output>): IMiddleware => {
  return async (resolve, parent, args, ctx, info) => {
    const uploadArgumentsNames = getUploadArgumentsNames(info)

    const uploads = await Promise.all(
      uploadArgumentsNames.map(uploadArgumentName =>
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
