import { Client, Storage } from "appwrite";
import { appwriteConfig } from "./appwrite";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

function getStorage(): Storage {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint || "")
    .setProject(appwriteConfig.projectId || "");
  return new Storage(client);
}

/**
 * Generate direct Appwrite Storage View URL string with cache-busting version parameter
 */
export function getProductImageUrl(
  productUuid: string,
  imageUri?: string | null,
  updatedAt?: string | number,
): string {
  const v = updatedAt
    ? typeof updatedAt === "number"
      ? updatedAt
      : new Date(updatedAt).getTime()
    : Date.now();

  if (imageUri && typeof imageUri === "string" && imageUri.startsWith("http")) {
    const sep = imageUri.includes("?") ? "&" : "?";
    return `${imageUri}${sep}v=${v}`;
  }

  if (!appwriteConfig.endpoint || !appwriteConfig.projectId || !appwriteConfig.storageId) {
    return "";
  }
  return `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${productUuid}/view?project=${appwriteConfig.projectId}&v=${v}`;
}

// Upload image to Appwrite Storage (overwriting existing file)
export async function uploadProductImage(
  file: File,
  productUuid: string,
): Promise<string> {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image size exceeds 5MB limit");
  }

  if (!appwriteConfig.storageId) {
    throw new Error("Storage ID is missing from Appwrite configuration.");
  }

  const storage = getStorage();

  try {
    await storage.deleteFile(appwriteConfig.storageId, productUuid);
  } catch (_) {
    // Ignore error if file did not exist
  }

  await storage.createFile(
    appwriteConfig.storageId,
    productUuid,
    file,
  );

  return getProductImageUrl(productUuid);
}

// Delete image from Appwrite Storage
export async function deleteProductImage(productUuid: string): Promise<void> {
  try {
    if (!appwriteConfig.storageId) return;
    const storage = getStorage();
    await storage.deleteFile(appwriteConfig.storageId, productUuid);
  } catch (error) {
    console.error("[imageStorage] Failed to delete image:", error);
  }
}
