export enum PartyTypeEnum {
  FARM = 'farm',
  BROKER = 'broker',
  SHOP_OWNER = 'shop_owner',
  CUSTOMER = 'customer',
  FACTORY = 'factory',
  INTERNAL_DEPARTMENT = 'internal_department',
  RANDOM_USER = 'random_user',
  INVESTOR = 'investor',
  PARTNER = 'partner',
  EMPLOYEE = 'employee',
}

/** User roles that may be linked one-to-one with an external Party record. */
export const PARTY_USER_ROLE_NAMES = [
  'PARTY',
  'FARM',
  'BROKER',
  'SHOP_OWNER',
  'CUSTOMER',
  'FACTORY',
  'RANDOM_USER',
  'INVESTOR',
  'PARTNER',
  'EMPLOYEE',
] as const;
