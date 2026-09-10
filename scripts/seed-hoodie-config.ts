import { PrismaClient } from '@prisma/client';
import { 
  INITIAL_HOODIE_PRODUCT_TYPES, 
  INITIAL_TSHIRT_PRODUCT_TYPES,
  HOODIE_COLORS
} from '../src/lib/catalogueDefaults';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main() {
  console.log('Seeding Product Types for Hoodies and T-Shirts...');

  // 1. Locate Hoodies category
  let hoodieCat = await prisma.category.findFirst({
    where: {
      OR: [
        { id: '6a92c70233d6376b768a9e18' },
        { slug: 'hoodies' },
        { slug: 'hoodie' },
        { name: { equals: 'Hoodies', mode: 'insensitive' } }
      ]
    }
  });

  if (!hoodieCat) {
    hoodieCat = await prisma.category.create({
      data: {
        name: 'Hoodies',
        slug: 'hoodies',
        code: 'HOD',
        description: 'Signature heavyweight fleece and zipper hoodies',
        sortOrder: 3,
        status: 'ACTIVE',
      }
    });
    console.log('Created Hoodies category:', hoodieCat.id);
  } else {
    console.log('Found Hoodies category:', hoodieCat.name, hoodieCat.id);
  }

  // 2. Locate T-Shirts category
  let tshirtCat = await prisma.category.findFirst({
    where: {
      OR: [
        { id: '6a92c70133d6376b768a9e16' },
        { slug: 't-shirts' },
        { slug: 't-shirt' },
        { name: { equals: 'T-Shirts', mode: 'insensitive' } }
      ]
    }
  });

  if (!tshirtCat) {
    tshirtCat = await prisma.category.create({
      data: {
        name: 'T-Shirts',
        slug: 't-shirts',
        code: 'TSH',
        description: 'Premium heavyweight and oversized t-shirts',
        sortOrder: 1,
        status: 'ACTIVE',
      }
    });
    console.log('Created T-Shirts category:', tshirtCat.id);
  } else {
    console.log('Found T-Shirts category:', tshirtCat.name, tshirtCat.id);
  }

  // Clean up any legacy Hoodie product types in DB that are not in the 3 allowed options
  const allowedHoodieNames = INITIAL_HOODIE_PRODUCT_TYPES.map(h => h.name.toLowerCase());
  const allDbHoodieTypes = await prisma.productType.findMany({
    where: { categoryId: hoodieCat.id }
  });
  for (const dbType of allDbHoodieTypes) {
    if (!allowedHoodieNames.includes(dbType.name.toLowerCase())) {
      await prisma.productType.delete({ where: { id: dbType.id } }).catch(() => null);
      console.log(`Removed legacy Hoodie ProductType: ${dbType.name}`);
    }
  }

  // 3. Seed Hoodie Product Types for hoodieCat (Strictly 3 options)
  for (const ht of INITIAL_HOODIE_PRODUCT_TYPES) {
    const existing = await prisma.productType.findFirst({
      where: {
        categoryId: hoodieCat.id,
        name: { equals: ht.name, mode: 'insensitive' }
      }
    });
    const typeSlug = slugify(ht.name);
    if (!existing) {
      await prisma.productType.create({
        data: {
          categoryId: hoodieCat.id,
          name: ht.name,
          slug: typeSlug,
          code: ht.code,
          sortOrder: ht.sortOrder,
          status: 'ACTIVE',
        }
      });
      console.log(`Created Hoodie ProductType: ${ht.name} (${ht.code})`);
    } else {
      await prisma.productType.update({
        where: { id: existing.id },
        data: {
          code: ht.code,
          slug: typeSlug,
          sortOrder: ht.sortOrder,
          status: 'ACTIVE',
        }
      });
      console.log(`Updated Hoodie ProductType: ${ht.name} (${ht.code})`);
    }
  }

  // 4. Seed T-Shirt Product Types for tshirtCat
  for (const tt of INITIAL_TSHIRT_PRODUCT_TYPES) {
    const existing = await prisma.productType.findFirst({
      where: {
        categoryId: tshirtCat.id,
        name: { equals: tt.name, mode: 'insensitive' }
      }
    });
    const typeSlug = slugify(tt.name);
    if (!existing) {
      await prisma.productType.create({
        data: {
          categoryId: tshirtCat.id,
          name: tt.name,
          slug: typeSlug,
          code: tt.code,
          sortOrder: tt.sortOrder,
          status: 'ACTIVE',
        }
      });
      console.log(`Created T-Shirt ProductType: ${tt.name} (${tt.code})`);
    } else {
      await prisma.productType.update({
        where: { id: existing.id },
        data: {
          code: tt.code,
          slug: typeSlug,
          sortOrder: tt.sortOrder,
          status: 'ACTIVE',
        }
      });
      console.log(`Updated T-Shirt ProductType: ${tt.name} (${tt.code})`);
    }
  }

  // 5. Ensure the 18 Hoodie Colors exist in ProductColor collection
  for (const hc of HOODIE_COLORS) {
    const existingColor = await prisma.productColor.findFirst({
      where: {
        name: { equals: hc.name, mode: 'insensitive' }
      }
    });
    if (!existingColor) {
      await prisma.productColor.create({
        data: {
          name: hc.name,
          code: hc.code,
          hex: hc.hex,
          sortOrder: hc.number,
          status: 'ACTIVE',
        }
      });
      console.log(`Created ProductColor: ${hc.name} (${hc.code}, ${hc.hex})`);
    }
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
