import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import MyTickets from "./pages/MyTickets.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import UserPortal from "./pages/UserPortal.jsx";
import "./styles/admin.css";
import "./styles/user.css";

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
        <Route path="/marketplace" element={<Marketplace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </WalletProvider>
    </AuthProvider>
  );
}
