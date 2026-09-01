import multer from "multer"
import type { NextFunction, Request, Response } from "express"
import { STUDIO_AVATAR_POLICY } from "@playblast/shared"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: STUDIO_AVATAR_POLICY.maxSizeBytes },
  fileFilter(_req, file, cb) {
    if ((STUDIO_AVATAR_POLICY.allowedMimeTypes as readonly string[]).includes(file.mimetype)) {
      cb(null, true)
      return
    }

    cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed."))
  },
})

export function createAvatarUploadMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single("avatar")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            error: "File is too large.",
            code: "PAYLOAD_TOO_LARGE",
          })
          return
        }

        res.status(400).json({
          error: err.message,
          code: "VALIDATION_FAILED",
        })
        return
      }

      if (err) {
        res.status(400).json({
          error: err.message,
          code: "VALIDATION_FAILED",
        })
        return
      }

      next()
    })
  }
}
