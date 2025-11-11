import { put, del } from "@vercel/blob";

export async function uploadToBlob(path: string, data: Buffer, contentType?: string) {
  const res = await put(path, data, {
    access: "public",
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  // res: { url, pathname, size, uploadedAt, ... }
  return res;
}

export async function deleteFromBlob(pathname: string) {
  await del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
