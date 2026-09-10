import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { CartProvider } from '../../context/CartContext';
import { WishlistProvider } from '../../context/WishlistContext';
import CartSidebar from '../../components/CartSidebar';
import AuthModal from '../../components/AuthModal';

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <WishlistProvider>
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
