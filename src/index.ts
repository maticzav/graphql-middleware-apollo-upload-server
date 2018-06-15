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

// get fields from Upload scalar type

function getUploadArgumentsNames(info: GraphQLResolveInfo): string[] {
  return []
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
