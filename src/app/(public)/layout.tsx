import dynamic from 'next/dynamic';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ScrollRestorationHandler from '../../components/ScrollRestorationHandler';
import { CartProvider } from '../../context/CartContext';
import { WishlistProvider } from '../../context/WishlistContext';

// Dynamically load heavy client modals to code-split initial JavaScript bundle and improve page load performance
const CartSidebar = dynamic(() => import('../../components/CartSidebar'));
const AuthModal = dynamic(() => import('../../components/AuthModal'));

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <WishlistProvider>
        <ScrollRestorationHandler />
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#FFFFFF', width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'clip' }}>
          <Header />
          <main style={{ flex: 1, backgroundColor: '#FFFFFF', width: '100%', maxWidth: '100%', minWidth: 0 }}>{children}</main>
          <Footer />
          <CartSidebar />
          <AuthModal />
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}
