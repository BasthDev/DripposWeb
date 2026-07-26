import { account } from "./appwrite";

export interface UserPlan {
  tier: "basic" | "pro";
  duration?: 1 | 3 | 6 | 12;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  isLegacyUser?: boolean;
  isFreeTrial?: boolean;
}

export interface PlanPreferences {
  plan?: UserPlan;
  isLegacyUser?: boolean;
}

export interface UserPreferences {
  planPreferences?: PlanPreferences;
  isSubs?: any;
  trial?: any;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    const user = await account.get();
    const prefs = user.prefs as UserPreferences;
    return prefs || {};
  } catch (error) {
    console.error("[userPreferences] Failed to get user preferences:", error);
    return {};
  }
}

export async function getUserPlan(userId: string): Promise<UserPlan | undefined> {
  try {
    const prefs = await getUserPreferences(userId);
    return prefs.planPreferences?.plan;
  } catch (error) {
    console.error("[userPreferences] Failed to get user plan:", error);
    return undefined;
  }
}

export async function updateUserPlan(userId: string, plan: UserPlan): Promise<boolean> {
  try {
    const prefs = await getUserPreferences(userId);
    if (!prefs.planPreferences) {
      prefs.planPreferences = {};
    }
    prefs.planPreferences.plan = plan;
    await account.updatePrefs(prefs);
    return true;
  } catch (error) {
    console.error("[userPreferences] Failed to update user plan:", error);
    return false;
  }
}

export async function isLegacyUser(userId: string): Promise<boolean> {
  try {
    const prefs = await getUserPreferences(userId);
    
    if (prefs.planPreferences?.isLegacyUser) {
      return true;
    }
    
    if (prefs.isSubs?.isSubscribed && !prefs.planPreferences?.plan) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[userPreferences] Failed to check legacy user status:", error);
    return false;
  }
}

export interface FeatureAccess {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

export async function checkFeatureAccess(userId: string, feature: string): Promise<FeatureAccess> {
  try {
    const userPlan = await getUserPlan(userId);
    const legacy = await isLegacyUser(userId);
    
    if (legacy) {
      return { allowed: true };
    }
    
    if (!userPlan || !userPlan.isActive) {
      return { allowed: false, reason: 'No active plan', upgradeRequired: true };
    }
    
    switch (feature) {
      case 'web_analytics':
      case 'employee_management':
      case 'cloud_sync':
        // Pro-only features (not available on free trial)
        if (userPlan.tier === 'pro' && !userPlan.isFreeTrial) {
          return { allowed: true };
        }
        return { 
          allowed: false, 
          reason: 'This feature requires Pro plan (not available on free trial)',
          upgradeRequired: true 
        };
        
      case 'basic_pos':
        // Available on Basic and Pro
        if (userPlan.tier === 'basic' || userPlan.tier === 'pro') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Active plan required', upgradeRequired: true };
        
      default:
        return { allowed: false, reason: 'Unknown feature' };
    }
  } catch (error) {
    console.error('[featureAccess] Failed to check feature access:', error);
    return { allowed: false, reason: 'Failed to check plan status' };
  }
}

export async function canAccessWebFeatures(userId: string): Promise<FeatureAccess> {
  return checkFeatureAccess(userId, 'web_analytics');
}

export async function canAccessEmployeeManagement(userId: string): Promise<FeatureAccess> {
  return checkFeatureAccess(userId, 'employee_management');
}

export async function canAccessSync(userId: string): Promise<FeatureAccess> {
  return checkFeatureAccess(userId, 'cloud_sync');
}