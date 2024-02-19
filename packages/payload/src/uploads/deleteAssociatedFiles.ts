import fs from 'fs'
import path from 'path'

import type { SanitizedCollectionConfig } from '../collections/config/types'
import type { SanitizedConfig } from '../config/types'
import type { PayloadRequest } from '../exports/types'
import type { FileData, FileToSave } from './types'

import { ErrorDeletingFile } from '../errors'
import fileExists from './fileExists'

type Args = {
  collectionConfig: SanitizedCollectionConfig
  config: SanitizedConfig
  doc: Record<string, unknown>
  files?: FileToSave[]
  overrideDelete: boolean
  req: PayloadRequest
}

export const deleteAssociatedFiles: (args: Args) => Promise<void> = async ({
  collectionConfig,
  config,
  doc,
  files = [],
  overrideDelete,
  req,
}) => {
  if (!collectionConfig.upload) return
  if (overrideDelete || files.length > 0) {
    const staticPath = path.resolve(config.paths.configDir, collectionConfig.upload.staticDir)

    const fileToDelete = `${staticPath}/${doc.filename}`

    try {
      if (await fileExists(fileToDelete)) {
        fs.unlinkSync(fileToDelete)
      }
    } catch (err) {
      throw new ErrorDeletingFile(req.t)
    }

    if (doc.sizes) {
      const sizes: FileData[] = Object.values(doc.sizes)
      // Since forEach will not wait until unlink is finished it could
      // happen that two operations will try to delete the same file.
      // To avoid this it is recommended to use "sync" instead
      // eslint-disable-next-line no-restricted-syntax
      for (const size of sizes) {
        const sizeToDelete = `${staticPath}/${size.filename}`
        try {
          // eslint-disable-next-line no-await-in-loop
          if (await fileExists(sizeToDelete)) {
            fs.unlinkSync(sizeToDelete)
          }
        } catch (err) {
          throw new ErrorDeletingFile(req.t)
        }
      }
    }
  }
}
