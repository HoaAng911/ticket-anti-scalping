import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import Layout from "./user/components/Layout.jsx";
import Home from "./user/pages/Home.jsx";
import EventDetail from "./user/pages/EventDetail.jsx";
import MyTickets from "./user/pages/MyTickets.jsx";
import Marketplace from "./user/pages/Marketplace.jsx";
import AdminDashboard from "./admin/pages/AdminDashboard.jsx";
import UserPortal from "./user/pages/UserPortal.jsx";
import Cart from "./user/pages/Cart.jsx";
import Ledger from "./user/pages/Ledger.jsx";
import MyInvoices from "./user/pages/MyInvoices.jsx";
import "./admin/styles/admin.css";
import "./user/styles/user.css";

function AppRoutes() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/admin")) {
    return <AdminDashboard />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/user" element={<UserPortal />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/my-invoices" element={<MyInvoices />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/ledger" element={<Ledger />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WalletProvider>
          <CartProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </CartProvider>
        </WalletProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
