"use client";

import Link from 'next/link';
import { Heart } from 'lucide-react';
import ProductCard from '../../../components/ProductCard';
import { useWishlist } from '../../../context/WishlistContext';
import shopStyles from '../shop/shop.module.css';

export default function WishlistClient({ allProducts }: { allProducts: any[] }) {
  const { wishlist, wishlistCount } = useWishlist();

  const wishlistedProducts = allProducts.filter((product) =>
    wishlist.includes(product.id)
  );

  return (
    <div className={shopStyles.shopContainer} style={{ paddingTop: '1.5rem', paddingBottom: '5rem' }}>
      <div style={{ borderBottom: '1px solid #eeeeee', paddingBottom: '1.25rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 0.35rem 0' }}>
          MY WISHLIST
        </h1>
        <p style={{ color: '#666666', fontSize: '0.875rem', margin: 0 }}>
          {wishlistCount} {wishlistCount === 1 ? 'item' : 'items'} saved
        </p>
      </div>

      {wishlistedProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px dashed #e5e5e5' }}>
          <Heart size={48} color="#cccccc" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Your wishlist is empty</h2>
          <p style={{ color: '#666666', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Explore our collection and click the heart icon to save your favorite luxury items.
          </p>
          <Link href="/shop" className="btn-primary">
            EXPLORE COLLECTION
          </Link>
        </div>
      ) : (
        <div className={shopStyles.productGrid}>
          {wishlistedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
