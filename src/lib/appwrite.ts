import { Account, Client, Databases, Functions } from "appwrite";

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "https://sgp.cloud.appwrite.io/v1";
const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "6a302b52000d71807c6f";
const databaseId =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "6a3030160007ee3d4c79";
const storageId =
  process.env.NEXT_PUBLIC_APPWRITE_STORAGE_ID || "6a60e840000839870b2c";
const functionId =
  process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_ID || "6a5fc0df003d2d38b83a";

const client = new Client().setEndpoint(endpoint).setProject(projectId || "");

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

/**
 * Helper to call Appwrite cloud function with payload
 */
export async function executeAppwriteFunction(payload: Record<string, any>) {
  try {
    const execution = await functions.createExecution(
      functionId, 
      JSON.stringify(payload)
    );
    
    if (typeof execution?.responseBody === "string") {
      try {
        return JSON.parse(execution.responseBody);
      } catch {
        return execution;
      }
    }
    return execution;
  } catch (error) {
    console.error("Appwrite function execution failed:", error);
    throw error;
  }
}

/**
 * Generate owner-specific collection ID for sync data.
 * Each owner gets their own collection: store_sync_{owner_uuid}
 */
export function getOwnerSyncCollectionId(ownerUuid: string): string {
  return `store_sync_${ownerUuid}`;
}

export const appwriteConfig = {
  endpoint,
  projectId,
  databaseId,
  storageId,
  functionId,
  staffCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_STAFF_COLLECTION_ID || "staff",
};

export default client;
