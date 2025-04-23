// Meesho Inventory Types
export interface MeeshoInventoryItem {
  reasonForCreditEntry: string; // Order status
  subOrderNo: string; // Order ID
  orderDate: string; // mm/dd/yyyy
  customerState: string;
  productName?: string; // Optional field to ignore
  sku: string;
  size?: string; // Optional field to ignore
  quantity: number;
  supplierListedPrice: number; // Incl. GST + Commission
  supplierDiscountedPrice?: number; // Optional field to ignore
  packetId?: string; // Optional field to ignore
}

// Marketplace Order Types
export interface OrderItem {
  skuCode: string;
  quantity: number;
  price: number;
}

export interface OrderAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: number;
}

export interface Order {
  orderId: string;
  orderStatus: string;
  orderDate: string;
  orderValue: number;
  marketplace: string;
  orderItems: OrderItem[];
  address: OrderAddress;
}
