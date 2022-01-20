import axios from "axios";
import crypto from "crypto";
import { parse } from "../lib/connections/sqs";
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";

const { WORLD_IMAGES_BUCKET } = process.env;
const s3 = new S3Client();

async function processMessage({ message, imageProperty }) {
  const { id, authorId, version } = message;
  const imageUrl = message[imageProperty];

  const response = await axios({
    url: imageUrl,
    method: "GET",
    responseType: 'stream',
  });

  const contentType = response.headers['content-type'];
  const imageUrlHash = crypto.createHash('sha256').update(imageUrl).digest('hex');
  const key = `${authorId}/${id}/${version}/${imageUrlHash}.png`;

  try {
    const upload = new Upload({
      client: s3,
      leavePartsOnError: false,
      params: {
        Bucket: WORLD_IMAGES_BUCKET,
        Key: key,
        Body: response.data,
        ContentType: contentType,
      },
    });

    await upload.done();
  } catch (error) {
    console.log("ERROR", error);
    throw error;
  }
}

export async function handler(event) {
  const messages = parse(event);

  for (const message of messages) {
    const saveImagePromise = processMessage({ message, imageProperty: "imageUrl" });
    const saveThumbnailPromise = processMessage({ message, imageProperty: "thumbnailImageUrl" });

    await Promise.all([saveImagePromise, saveThumbnailPromise]);
  }

  return { statusCode: 200 };
}
