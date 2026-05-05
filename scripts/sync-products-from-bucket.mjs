// =============================================================
// Script: Sincronizar productos desde el bucket de Supabase
// Estructura esperada: bucket/categoria/genero/producto.ext
// Ambas carpetas (categoria y genero) se asignan como categorías
//
// Uso: node scripts/sync-products-from-bucket.mjs
// Se puede correr múltiples veces sin duplicar productos
// =============================================================

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const BUCKET = 'Imagenes productos';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

function capitalize(str) {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getNameWithoutExtension(filename) {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}

function getExtension(filename) {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot).toLowerCase() : '';
}

// Cache de categorías para no consultar repetidamente
const categoryCache = new Map();

async function getOrCreateCategory(name) {
  const normalizedName = capitalize(name.trim());

  if (categoryCache.has(normalizedName)) {
    return categoryCache.get(normalizedName);
  }

  const slug = slugify(normalizedName);

  // Buscar por slug para evitar duplicados
  const { data: existing } = await supabase
    .from('categories')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (existing) {
    categoryCache.set(normalizedName, existing.id);
    return existing.id;
  }

  // Crear categoría
  const { data: created, error } = await supabase
    .from('categories')
    .insert({ name: normalizedName, slug })
    .select('id')
    .single();

  if (error) {
    console.error(`  Error creando categoría "${normalizedName}":`, error.message);
    return null;
  }

  console.log(`  Categoría creada: ${normalizedName}`);
  categoryCache.set(normalizedName, created.id);
  return created.id;
}

async function productExists(slug) {
  const { data } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .single();
  return data?.id || null;
}

async function listFolders(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(path, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

  if (error) {
    console.error(`Error listando ${path}:`, error.message);
    return [];
  }
  return data || [];
}

function getPublicUrl(filePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

async function syncProducts() {
  console.log('Sincronizando productos desde bucket:', BUCKET);
  console.log('---');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  // Nivel 1: categorías principales (ej: camisetas, pantalones)
  const topFolders = await listFolders('');
  const categoryFolders = topFolders.filter(item => !item.id); // carpetas no tienen id

  for (const catFolder of categoryFolders) {
    const categoryName = catFolder.name;
    console.log(`\nCategoría: ${capitalize(categoryName)}`);

    // Nivel 2: subcategorías/género (ej: hombre, mujer)
    const subFolders = await listFolders(categoryName);
    const genderFolders = subFolders.filter(item => !item.id);

    // También verificar si hay imágenes directamente en la carpeta de categoría
    const directImages = subFolders.filter(item =>
      item.id && IMAGE_EXTENSIONS.includes(getExtension(item.name))
    );

    // Procesar imágenes directas (sin subcarpeta de género)
    for (const image of directImages) {
      const productName = capitalize(getNameWithoutExtension(image.name));
      const slug = slugify(productName);
      const imagePath = `${categoryName}/${image.name}`;

      const existingId = await productExists(slug);
      if (existingId) {
        skipped++;
        continue;
      }

      const imageUrl = getPublicUrl(imagePath);
      const categoryId = await getOrCreateCategory(categoryName);

      const { data: product, error } = await supabase
        .from('products')
        .insert({
          name: productName,
          slug,
          description: null,
          price: 0,
          stock: 0,
          main_image: imageUrl,
          images: [],
          is_active: false, // inactivo hasta que le pongas precio
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  Error creando "${productName}":`, error.message);
        errors++;
        continue;
      }

      if (categoryId) {
        await supabase.from('product_categories').insert({
          product_id: product.id,
          category_id: categoryId,
        });
      }

      console.log(`  + ${productName}`);
      created++;
    }

    // Procesar subcarpetas de género
    for (const genderFolder of genderFolders) {
      const genderName = genderFolder.name;
      console.log(`  Subcategoría: ${capitalize(genderName)}`);

      // Nivel 3: imágenes de productos
      const files = await listFolders(`${categoryName}/${genderName}`);
      const images = files.filter(item =>
        item.id && IMAGE_EXTENSIONS.includes(getExtension(item.name))
      );

      for (const image of images) {
        const productName = capitalize(getNameWithoutExtension(image.name));
        const slug = slugify(productName);
        const imagePath = `${categoryName}/${genderName}/${image.name}`;

        // Verificar si ya existe
        const existingId = await productExists(slug);
        if (existingId) {
          skipped++;
          continue;
        }

        const imageUrl = getPublicUrl(imagePath);

        // Obtener o crear ambas categorías
        const categoryId = await getOrCreateCategory(categoryName);
        const genderId = await getOrCreateCategory(genderName);

        // Crear producto
        const { data: product, error } = await supabase
          .from('products')
          .insert({
            name: productName,
            slug,
            description: null,
            price: 0,
            stock: 0,
            main_image: imageUrl,
            images: [imageUrl],
            is_active: false,
          })
          .select('id')
          .single();

        if (error) {
          console.error(`  Error creando "${productName}":`, error.message);
          errors++;
          continue;
        }

        // Asignar ambas categorías
        const categoryLinks = [];
        if (categoryId) categoryLinks.push({ product_id: product.id, category_id: categoryId });
        if (genderId) categoryLinks.push({ product_id: product.id, category_id: genderId });

        if (categoryLinks.length > 0) {
          const { error: linkError } = await supabase
            .from('product_categories')
            .insert(categoryLinks);
          if (linkError) {
            console.error(`  Error asignando categorías a "${productName}":`, linkError.message);
          }
        }

        console.log(`    + ${productName}`);
        created++;
      }
    }
  }

  console.log('\n---');
  console.log(`Creados: ${created}`);
  console.log(`Ya existían: ${skipped}`);
  console.log(`Errores: ${errors}`);
}

syncProducts().catch(console.error);
