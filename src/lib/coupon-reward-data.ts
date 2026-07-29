export type CouponStatus = "Available" | "Applied" | "Used" | "Expired";
export type CouponCategory =
  | "Paint Offers"
  | "Plumbing Offers"
  | "Festival Offers"
  | "Bank Offers"
  | "New User"
  | "Contractor Deals";

export type Coupon = {
  id: string;
  code: string;
  discount: string;
  description: string;
  expiry: string;
  terms: string;
  category: CouponCategory;
  minimumOrder: string;
  maximumDiscount: string;
  status: CouponStatus;
};

export type RewardTier = "Silver" | "Gold" | "Platinum";
export type RewardHistoryStatus = "Earned" | "Redeemed" | "Pending";

export type RewardHistoryItem = {
  id: string;
  title: string;
  description: string;
  points: number;
  status: RewardHistoryStatus;
  date: string;
};

export type EarnWay = {
  id: string;
  title: string;
  description: string;
  points: string;
};

export type RedeemOption = {
  id: string;
  title: string;
  description: string;
  points: string;
};

export const COUPON_STATUSES: CouponStatus[] = [];
export const COUPON_CATEGORIES: CouponCategory[] = [];
export const COUPONS: Coupon[] = [];
export const CURRENT_POINTS = 0;
export const CURRENT_TIER: RewardTier = "Silver";
export const NEXT_TIER_POINTS = 0;
export const NEXT_REWARD = "";
export const REWARD_HISTORY: RewardHistoryItem[] = [];
export const EARN_WAYS: EarnWay[] = [];
export const REDEEM_OPTIONS: RedeemOption[] = [];
