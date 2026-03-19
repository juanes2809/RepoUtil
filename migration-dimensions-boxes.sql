-- Agregar dimensiones a la tabla de productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS width DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS length DECIMAL(10, 2) DEFAULT NULL;

-- Crear tabla de cajas para envío
CREATE TABLE IF NOT EXISTS shipping_boxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  width DECIMAL(10, 2) NOT NULL,
  height DECIMAL(10, 2) NOT NULL,
  length DECIMAL(10, 2) NOT NULL,
  max_weight DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Política RLS para shipping_boxes
ALTER TABLE shipping_boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on shipping_boxes" ON shipping_boxes FOR SELECT USING (true);
CREATE POLICY "Allow all access for service role on shipping_boxes" ON shipping_boxes USING (true) WITH CHECK (true);
