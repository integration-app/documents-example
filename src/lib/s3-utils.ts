import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { downloadFile } from "./download-utils";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Downloads a file from a given URI and uploads it to S3
 * @param downloadURI - The URI to download the file from
 * @param s3Key - The key (path) where the file will be stored in S3
 * @returns Promise<string> - The S3 URL where the file was uploaded
 */
export async function processAndUploadFile(downloadURI: string, s3Key: string) {
  const { buffer, extension } = await downloadFile(downloadURI);
  
  return await uploadToS3(s3Key, buffer, extension ?? "");

}

/**
 * Downloads a file from a given URI and uploads it to S3
 * @param downloadURI - The URI to download the file from
 * @param s3Key - The key (path) where the file will be stored in S3
 * @returns Promise<string> - The S3 URL where the file was uploaded
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  extension: string
): Promise<string> {
  const keyWithExtension = `${key}.${extension}`;
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: keyWithExtension,
    Body: body,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));

  return keyWithExtension;
}

export async function getS3ObjectStream(s3Key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  return response.Body;
}
