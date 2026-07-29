export const DEFAULT_COUNTRY = "India" as const;

export type AddressType = "Home" | "Office" | "Other";

export type SavedAddress = {
  id: string;
  fullName: string;
  mobileNumber: string;
  alternateMobile?: string;
  pinCode: string;
  houseFlat: string;
  street: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  country: typeof DEFAULT_COUNTRY;
  addressType: AddressType;
  isDefault: boolean;
};

export type AddressFormValues = Omit<SavedAddress, "id" | "isDefault"> & {
  isDefault: boolean;
};

export const INITIAL_ADDRESSES: SavedAddress[] = [];

export function formatAddressLine(address: SavedAddress) {
  return `${address.houseFlat}, ${address.street}, ${address.area}, ${address.city}, ${address.state} - ${address.pinCode}`;
}

export function getCompactAddress(address: SavedAddress) {
  return `${address.houseFlat}, ${address.city}`;
}
