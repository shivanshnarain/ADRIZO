import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Seeding authentic ADRIZO fashion catalogue matching reference image...');

  // 1. Categories
  const categoryData = [
    { name: 'T-Shirts', slug: 't-shirts', description: 'Premium heavyweight and oversized t-shirts' },
    { name: 'Shirts', slug: 'shirts', description: 'Casual linen and formal luxury shirts' },
    { name: 'Hoodies', slug: 'hoodies', description: 'Signature heavyweight fleece hoodies' },
    { name: 'Jackets', slug: 'jackets', description: 'Utility, denim, and overshirt jackets' },
    { name: 'Jeans', slug: 'jeans', description: 'Relaxed and straight fit premium denim' },
    { name: 'Pants', slug: 'pants', description: 'Cargo, tailored trousers, and chinos' },
    { name: 'Accessories', slug: 'accessories', description: 'Caps, bags, and luxury accessories' },
    { name: 'Men', slug: 'men', description: "Men's Luxury Fashion Collection" },
    { name: 'Women', slug: 'women', description: "Women's Luxury Fashion Collection" },
  ];

  const categories: Record<string, any> = {};

  for (const cat of categoryData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, status: 'ACTIVE' },
      create: { name: cat.name, slug: cat.slug, description: cat.description, status: 'ACTIVE' },
    });
    categories[cat.slug] = created;
  }

  // Delete older test products
  await prisma.product.deleteMany({
    where: {
      slug: { in: ['slug', 'ssdegr'] },
    },
  });

  // 2. Exact Products matching Reference Image
  const products = [
    {
      name: 'Oversized Contrast Tee',
      slug: 'oversized-contrast-tee',
      description: 'Crafted from 280 GSM luxury combed cotton with dropped shoulders, raw-edge accents, and signature relaxed silhouette.',
      categorySlug: 't-shirts',
      price: 899,
      salePrice: null,
      sku: 'ADR-TEE-001',
      stock: 45,
      featured: true,
      newArrival: true,
      onSale: false,
      colors: ['#111111', '#FFFFFF', '#6B7280', '#D4AF37'],
      colorNames: ['Black', 'White', 'Charcoal', 'Gold'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      images: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=80&w=800',
      ],
    },
    {
      name: 'Linen Blend Shirt',
      slug: 'linen-blend-shirt',
      description: 'Breathable lightweight linen-cotton blend overshirt designed for effortless layering and warm climate comfort.',
      categorySlug: 'shirts',
      price: 1499,
      salePrice: 1199,
      sku: 'ADR-SHT-002',
      stock: 30,
      featured: true,
      newArrival: false,
      onSale: true,
      colors: ['#4A5568', '#FFFFFF', '#4B5320', '#D2B48C'],
      colorNames: ['Slate Gray', 'White', 'Olive Green', 'Sand'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      images: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?auto=format&fit=crop&q=80&w=800',
      ],
    },
    {
      name: 'Signature Hoodie',
      slug: 'signature-hoodie',
      description: '450 GSM heavyweight organic french terry with minimalist ADRIZO chest emblem and double-layered hood.',
      categorySlug: 'hoodies',
      price: 1699,
      salePrice: null,
      sku: 'ADR-HOD-003',
      stock: 50,
      featured: true,
      newArrival: true,
      onSale: false,
      colors: ['#111111', '#1E293B', '#F3F4F6'],
      colorNames: ['Black', 'Midnight Navy', 'Off-White'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      images: [
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&q=80&w=800',
      ],
    },
    {
      name: 'Utility Jacket',
      slug: 'utility-jacket',
      description: 'Structured canvas overshirt jacket with functional flap pockets, horn buttons, and tailored workwear fit.',
      categorySlug: 'jackets',
      price: 2199,
      salePrice: 1869,
      sku: 'ADR-JKT-004',
      stock: 25,
      featured: true,
      newArrival: false,
      onSale: true,
      colors: ['#F5F5DC', '#111111', '#3F4839'],
      colorNames: ['Ecru / Off-White', 'Black', 'Dark Olive'],
      sizes: ['M', 'L', 'XL', 'XXL'],
      images: [
        'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=800',
      ],
    },
    {
      name: 'Cargo Pants',
      slug: 'cargo-pants',
      description: 'Relaxed fit multi-pocket tactical cargo trousers made with durable cotton ripstop and adjustable ankle cuffs.',
      categorySlug: 'pants',
      price: 1799,
      salePrice: null,
      sku: 'ADR-PNT-005',
      stock: 35,
      featured: true,
      newArrival: true,
      onSale: false,
      colors: ['#111111', '#4A4A4A', '#8F9779'],
      colorNames: ['Black', 'Charcoal', 'Sage Green'],
      sizes: ['S', 'M', 'L', 'XL'],
      images: [
        'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&q=80&w=800',
      ],
    },
    {
      name: 'Ribbed Polo T-Shirt',
      slug: 'ribbed-polo-t-shirt',
      description: 'Fine-knit combed cotton polo with a ribbed collar, tonal button placket, and sleek modern fit.',
      categorySlug: 't-shirts',
      price: 999,
      salePrice: 899,
      sku: 'ADR-POL-006',
      stock: 60,
      featured: true,
      newArrival: false,
      onSale: true,
      colors: ['#111111', '#1E3A8A', '#FFFFFF'],
      colorNames: ['Black', 'Deep Navy', 'White'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      images: [
        'https://images.unsplash.com/photo-1618354691792-d1d42acfd860?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&q=80&w=800',
      ],
    },
    {
      name: 'Relaxed Fit Jeans',
      slug: 'relaxed-fit-jeans',
      description: '13.5 oz authentic vintage wash selvedge denim with relaxed straight leg silhouette and custom brass hardware.',
      categorySlug: 'jeans',
      price: 1999,
      salePrice: null,
      sku: 'ADR-JNS-007',
      stock: 40,
      featured: true,
      newArrival: true,
      onSale: false,
      colors: ['#6B8EAE', '#1E293B', '#111111'],
      colorNames: ['Light Indigo', 'Dark Indigo', 'Washed Black'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      images: [
        'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=1000',
        'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&q=80&w=1000',
        'https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?auto=format&fit=crop&q=80&w=1000',
        'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=1000',
        'https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&q=80&w=1000',
        'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?auto=format&fit=crop&q=80&w=1000',
      ],
    },
    {
      name: 'Classic Cap',
      slug: 'classic-cap',
      description: '6-panel structured cotton twill baseball cap featuring 3D embroidered ADRIZO typography and metal buckle closure.',
      categorySlug: 'accessories',
      price: 499,
      salePrice: 439,
      sku: 'ADR-ACC-008',
      stock: 80,
      featured: true,
      newArrival: false,
      onSale: true,
      colors: ['#111111', '#FFFFFF', '#1E293B'],
      colorNames: ['Black', 'White', 'Navy'],
      sizes: ['Free Size'],
      images: [
        'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?auto=format&fit=crop&q=80&w=800',
      ],
    },
  ];

  for (let index = 0; index < products.length; index++) {
    const p = products[index];
    const category = categories[p.categorySlug];
    const createdProduct = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        salePrice: p.salePrice,
        sku: p.sku,
        stock: p.stock,
        featured: p.featured,
        newArrival: p.newArrival,
        onSale: p.onSale,
        categoryId: category?.id || null,
        colorsRaw: JSON.stringify(p.colors),
        sizesRaw: JSON.stringify(p.sizes),
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        salePrice: p.salePrice,
        sku: p.sku,
        stock: p.stock,
        featured: p.featured,
        newArrival: p.newArrival,
        onSale: p.onSale,
        categoryId: category?.id || null,
        colorsRaw: JSON.stringify(p.colors),
        sizesRaw: JSON.stringify(p.sizes),
      },
    });

    // Clean old images and create new ones
    await prisma.productImage.deleteMany({ where: { productId: createdProduct.id } });
    for (let i = 0; i < p.images.length; i++) {
      await prisma.productImage.create({
        data: {
          productId: createdProduct.id,
          url: p.images[i],
          altText: p.name,
          isPrimary: i === 0,
          sortOrder: i,
        },
      });
    }

    // Clean and create variants
    await prisma.productVariant.deleteMany({ where: { productId: createdProduct.id } });
    for (const size of p.sizes) {
      for (const color of p.colorNames) {
        await prisma.productVariant.create({
          data: {
            productId: createdProduct.id,
            size,
            color,
            sku: `${p.sku}-${size}-${color.toUpperCase().replace(/\s+/g, '')}`,
            stock: 10,
            priceAdjustment: 0,
          },
        });
      }
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
