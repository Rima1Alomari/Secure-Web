import AWS from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'YOUR_AWS_ACCESS_KEY',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'YOUR_AWS_SECRET_KEY',
  region: process.env.AWS_REGION || 'us-east-1'
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'your-bucket-name'

export const generateUploadUrl = async (fileName, fileType) => {
  const key = `uploads/${uuidv4()}-${fileName}`

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: fileType,
    Expires: 3600
  }

  const uploadUrl = await s3.getSignedUrlPromise('putObject', params)

  return { uploadUrl, key }
}

export const generateDownloadUrl = async (key, expiresIn = 3600) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn
  }

  return s3.getSignedUrlPromise('getObject', params)
}

export const deleteFile = async (key) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key
  }

  return s3.deleteObject(params).promise()
}

export { s3, BUCKET_NAME }

