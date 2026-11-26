import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  buildMediaKey,
  isMediaConfigured,
  mediaPublicUrl,
  type MediaStorage,
  type PresignRequest,
  type PresignResponse,
} from "./storage";

class R2MediaStorage implements MediaStorage {
  isConfigured(): boolean {
    return isMediaConfigured();
  }

  async createPresignedPut(req: PresignRequest): Promise<PresignResponse> {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error("Media storage not configured");
    }

    const key = buildMediaKey(req.kind, req.entityId, req.contentType);
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: req.contentType,
      ContentLength: req.sizeBytes,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
    return {
      uploadUrl,
      key,
      publicUrl: mediaPublicUrl(key),
    };
  }
}

export const mediaStorage: MediaStorage = new R2MediaStorage();
