import { prisma } from '../src/lib/prisma';

async function testObjectIdQuery() {
  console.log('Testing query by slug...');
  const slug = 'bottle-green-zipper-polo-t-shirt';
  try {
    const res = await prisma.product.findFirst({
      where: {
        OR: [
          { id: slug },
          { slug: slug }
        ]
      }
    });
    console.log('Query result:', res);
  } catch (err: any) {
    console.error('CRASHED with OR query containing slug in id:', err.message);
  }

  console.log('\nTesting safe query with conditional ObjectId...');
  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(slug);
  const where = isValidObjectId ? { OR: [{ id: slug }, { slug }] } : { slug };
  const safeRes = await prisma.product.findFirst({
    where,
    include: { images: true, category: true }
  });
  console.log('Safe query result:', safeRes ? safeRes.name : 'Not found');
}

testObjectIdQuery().catch(console.error).finally(() => prisma.$disconnect());
