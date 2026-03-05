import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import PWAInstallBanner from "./components/PWAInstallBanner";
import Accounts from "./pages/admin/Accounts";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminProfile from "./pages/admin/AdminProfile";
import Customers from "./pages/admin/Customers";
import Dashboard from "./pages/admin/Dashboard";
import Orders from "./pages/admin/Orders";
import Products from "./pages/admin/Products";
import Settings from "./pages/admin/Settings";
import Users from "./pages/admin/Users";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerLayout from "./pages/customer/CustomerLayout";
import CustomerOrders from "./pages/customer/CustomerOrders";
import CustomerStatement from "./pages/customer/CustomerStatement";
import OrderConfirmation from "./pages/customer/OrderConfirmation";
import OrderPage from "./pages/customer/OrderPage";
import StoreSelectorPage from "./pages/customer/StoreSelectorPage";
import RiderDashboard from "./pages/rider/RiderDashboard";
import RiderLayout from "./pages/rider/RiderLayout";

// Root route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
      <PWAInstallBanner />
    </>
  ),
});

// Customer public routes
const customerIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: StoreSelectorPage,
});

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/order",
  beforeLoad: () => {
    const token = localStorage.getItem("a1vs_customer_token");
    if (!token) {
      throw redirect({ to: "/" });
    }
  },
  component: OrderPage,
});

const orderConfirmationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/order/confirmation",
  beforeLoad: () => {
    const token = localStorage.getItem("a1vs_customer_token");
    if (!token) {
      throw redirect({ to: "/" });
    }
  },
  component: OrderConfirmation,
});

// Customer layout route (protected)
const customerLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer",
  beforeLoad: () => {
    const token = localStorage.getItem("a1vs_customer_token");
    if (!token) {
      throw redirect({ to: "/" });
    }
  },
  component: CustomerLayout,
});

const customerDashboardRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: "/dashboard",
  component: CustomerDashboard,
});

const customerOrdersRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: "/orders",
  component: CustomerOrders,
});

const customerStatementRoute = createRoute({
  getParentRoute: () => customerLayoutRoute,
  path: "/statement",
  component: CustomerStatement,
});

// Admin routes
const adminIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: () => {
    const token = localStorage.getItem("a1vs_admin_token");
    if (!token) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: () => <AdminLayout />,
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminIndexRoute,
  path: "/",
  component: Dashboard,
});

const adminProductsRoute = createRoute({
  getParentRoute: () => adminIndexRoute,
  path: "products",
  component: Products,
});

const adminCustomersRoute = createRoute({
  getParentRoute: () => adminIndexRoute,
  path: "customers",
  component: Customers,
});

const adminOrdersRoute = createRoute({
  getParentRoute: () => adminIndexRoute,
  path: "orders",
  component: Orders,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminIndexRoute,
  path: "users",
  component: Users,
});

const adminSettingsRoute = createRoute({
  getParentRoute: () => adminIndexRoute,
  path: "settings",
  component: Settings,
});

const adminAccountsRoute = createRoute({
  getParentRoute: () => adminIndexRoute,
  path: "accounts",
  component: Accounts,
});

const adminProfileRoute = createRoute({
  getParentRoute: () => adminIndexRoute,
  path: "profile",
  component: AdminProfile,
});

const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/login",
  component: AdminLogin,
});

// Rider routes (protected)
const riderLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rider",
  beforeLoad: () => {
    const token = localStorage.getItem("a1vs_rider_token");
    if (!token) throw redirect({ to: "/admin/login" });
  },
  component: RiderLayout,
});

const riderDashboardRoute = createRoute({
  getParentRoute: () => riderLayoutRoute,
  path: "/",
  component: RiderDashboard,
});

const routeTree = rootRoute.addChildren([
  customerIndexRoute,
  orderRoute,
  orderConfirmationRoute,
  customerLayoutRoute.addChildren([
    customerDashboardRoute,
    customerOrdersRoute,
    customerStatementRoute,
  ]),
  adminLoginRoute,
  adminIndexRoute.addChildren([
    adminDashboardRoute,
    adminProductsRoute,
    adminCustomersRoute,
    adminOrdersRoute,
    adminUsersRoute,
    adminSettingsRoute,
    adminAccountsRoute,
    adminProfileRoute,
  ]),
  riderLayoutRoute.addChildren([riderDashboardRoute]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
