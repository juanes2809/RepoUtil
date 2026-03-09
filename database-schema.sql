-- Ecommerce Platform Database Schema for Supabase
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories Table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  sku VARCHAR(100) UNIQUE,
  main_image TEXT,
  images TEXT[], -- Array of image URLs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product-Categories Join Table (many-to-many)
CREATE TABLE product_categories (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- Colombian Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE
);

-- Colombian Cities
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  delivery_days INTEGER DEFAULT 6,
  delivery_cost DECIMAL(10, 2) DEFAULT 0
);

-- Coupons Table
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  
  -- Delivery info
  delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('pickup', 'delivery')),
  department VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  
  -- Payment info
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_reference VARCHAR(255),
  
  -- Order details
  subtotal DECIMAL(10, 2) NOT NULL,
  delivery_cost DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  coupon_code VARCHAR(50),
  total DECIMAL(10, 2) NOT NULL,
  
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table (for admin authentication)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_product_categories_product ON product_categories(product_id);
CREATE INDEX idx_product_categories_category ON product_categories(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_orders_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_cities_department ON cities(department_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Colombian Departments
INSERT INTO departments (name, code) VALUES
  ('Amazonas', 'AMA'),
  ('Antioquia', 'ANT'),
  ('Arauca', 'ARA'),
  ('Atlántico', 'ATL'),
  ('Bolívar', 'BOL'),
  ('Boyacá', 'BOY'),
  ('Caldas', 'CAL'),
  ('Caquetá', 'CAQ'),
  ('Casanare', 'CAS'),
  ('Cauca', 'CAU'),
  ('Cesar', 'CES'),
  ('Chocó', 'CHO'),
  ('Córdoba', 'COR'),
  ('Cundinamarca', 'CUN'),
  ('Guainía', 'GUA'),
  ('Guaviare', 'GUV'),
  ('Huila', 'HUI'),
  ('La Guajira', 'LAG'),
  ('Magdalena', 'MAG'),
  ('Meta', 'MET'),
  ('Nariño', 'NAR'),
  ('Norte de Santander', 'NSA'),
  ('Putumayo', 'PUT'),
  ('Quindío', 'QUI'),
  ('Risaralda', 'RIS'),
  ('San Andrés y Providencia', 'SAP'),
  ('Santander', 'SAN'),
  ('Sucre', 'SUC'),
  ('Tolima', 'TOL'),
  ('Valle del Cauca', 'VAC'),
  ('Vaupés', 'VAU'),
  ('Vichada', 'VID');

-- Insert major cities (you can add more cities as needed)
INSERT INTO cities (department_id, name, delivery_days, delivery_cost) VALUES
  ((SELECT id FROM departments WHERE code = 'SAN'), 'Bucaramanga', 1, 5000),
  ((SELECT id FROM departments WHERE code = 'SAN'), 'Floridablanca', 1, 5000),
  ((SELECT id FROM departments WHERE code = 'SAN'), 'Girón', 1, 5000),
  ((SELECT id FROM departments WHERE code = 'SAN'), 'Piedecuesta', 1, 5000),
  ((SELECT id FROM departments WHERE code = 'ANT'), 'Medellín', 5, 15000),
  ((SELECT id FROM departments WHERE code = 'CUN'), 'Bogotá', 5, 15000),
  ((SELECT id FROM departments WHERE code = 'VAC'), 'Cali', 5, 15000),
  ((SELECT id FROM departments WHERE code = 'ATL'), 'Barranquilla', 6, 20000);

-- Create sample category
INSERT INTO categories (name, slug, description) VALUES
  ('Electrónica', 'electronica', 'Productos electrónicos y tecnología');

-- Enable Row Level Security (RLS) for public access
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products, categories, and product_categories
CREATE POLICY "Public can view products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can view product_categories" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Public can view departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Public can view cities" ON cities FOR SELECT USING (true);
CREATE POLICY "Public can view active coupons" ON coupons FOR SELECT USING (is_active = true);

-- Allow public to create orders
CREATE POLICY "Public can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can create order items" ON order_items FOR INSERT WITH CHECK (true);

-- Admin policies (you'll need to set up proper authentication)
-- For now, all authenticated users can manage everything
CREATE POLICY "Auth users can manage products" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can manage product_categories" ON product_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can view all orders" ON orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can update orders" ON orders FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can view order items" ON order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can manage coupons" ON coupons FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- MIGRATION: If you already have the old schema with category_id
-- on products, run this migration in your Supabase SQL Editor:
-- ============================================================
--
-- -- 1. Create the join table
-- CREATE TABLE product_categories (
--   product_id UUID REFERENCES products(id) ON DELETE CASCADE,
--   category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
--   PRIMARY KEY (product_id, category_id)
-- );
--
-- -- 2. Enable RLS
-- ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public can view product_categories" ON product_categories FOR SELECT USING (true);
-- CREATE POLICY "Auth users can manage product_categories" ON product_categories FOR ALL USING (auth.role() = 'authenticated');
--
-- -- 3. Migrate existing category_id data to join table
-- INSERT INTO product_categories (product_id, category_id)
-- SELECT id, category_id FROM products WHERE category_id IS NOT NULL;
--
-- -- 4. Create indexes
-- CREATE INDEX idx_product_categories_product ON product_categories(product_id);
-- CREATE INDEX idx_product_categories_category ON product_categories(category_id);
--
-- -- 5. Drop old column and index
-- DROP INDEX IF EXISTS idx_products_category;
-- ALTER TABLE products DROP COLUMN category_id;
-- ============================================================
