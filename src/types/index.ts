export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  sku: string | null;
  main_image: string | null;
  images: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: Category[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface City {
  id: string;
  department_id: string;
  name: string;
  delivery_days: number;
  delivery_cost: number;
  department?: Department;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  clerk_user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  delivery_type: 'pickup' | 'delivery';
  department: string | null;
  city: string | null;
  address: string | null;
  payment_method: string | null;
  payment_status: string;
  payment_reference: string | null;
  subtotal: number;
  delivery_cost: number;
  discount: number;
  coupon_code: string | null;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CheckoutData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryType: 'pickup' | 'delivery';
  department?: string;
  city?: string;
  address?: string;
  couponCode?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  lowStock: number;
  revenueChange: number;
  ordersChange: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}
