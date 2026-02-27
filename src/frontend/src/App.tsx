import { RouterProvider, createRouter, createRoute, createRootRoute, redirect, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Customers from "./pages/admin/Customers";
import Orders from "./pages/admin/Orders";
import Users from "./pages/admin/Users";
import Settings from "./pages/admin/Settings";
import Accounts from "./pages/admin/Accounts";
import AdminProfile from "./pages/admin/AdminProfile";
import StoreSelectorPage from "./pages/customer/StoreSelectorPage";
import OrderPage from "./pages/customer/OrderPage";
import OrderConfirmation from "./pages/customer/OrderConfirmation";
import CustomerLayout from "./pages/customer/CustomerLayout";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerOrders from "./pages/customer/CustomerOrders";
import CustomerStatement from "./pages/customer/CustomerStatement";

// Root route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
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
