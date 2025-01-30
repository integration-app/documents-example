import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFile } from "./download-utils";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType?: string
): Promise<string> {
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
    Body: body,
    ContentType: contentType,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));
  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function processAndUploadFile(downloadURI: string, s3Key: string) {
  const { buffer, extension } = await downloadFile(downloadURI);
  const s3Url = await uploadToS3(s3Key, buffer, extension ?? undefined);

  return s3Url;
}
