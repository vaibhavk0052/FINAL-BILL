import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { InvoiceProvider } from "@/contexts/InvoiceContext";
import { QuotationProvider } from "./contexts/QuotationContext";
import { PurchaseProvider } from "./contexts/PurchaseContext";
import { ItemProvider } from "./contexts/ItemContext";
import { CustomerProvider } from "./contexts/CustomerContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateBill from "./pages/CreateBill";
import SalesHistory from "./pages/SalesHistory";
import AllBills from "./pages/AllBills";
import CreateQuotation from "./pages/CreateQuotation";
import QuotationList from "./pages/QuotationList";
import DailyReport from "./pages/DailyReport";
import PurchaseEntry from "./pages/PurchaseEntry";
import ManageItems from "./pages/ManageItems";
import CustomerList from "./pages/CustomerList";
import AddExpenses from "./pages/AddExpenses";
import AddEmployee from "./pages/AddEmployee";
import BillTrash from "./pages/BillTrash";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'superadmin') return <Navigate to="/" replace />;

  return <>{children}</>;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <InvoiceProvider>
        <QuotationProvider>
          <PurchaseProvider>
            <ItemProvider>
              <CustomerProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
                      <Route path="/create-bill" element={<ProtectedLayout><CreateBill /></ProtectedLayout>} />
                      <Route path="/edit-bill/:id" element={<ProtectedLayout><CreateBill /></ProtectedLayout>} />
                      <Route path="/sales-history" element={<ProtectedLayout><SalesHistory /></ProtectedLayout>} />
                      <Route path="/all-bills" element={<ProtectedLayout><AllBills /></ProtectedLayout>} />
                      <Route path="/create-quotation" element={<ProtectedLayout><CreateQuotation /></ProtectedLayout>} />
                      <Route path="/edit-quotation/:id" element={<ProtectedLayout><CreateQuotation /></ProtectedLayout>} />
                      <Route path="/quotations" element={<ProtectedLayout><QuotationList /></ProtectedLayout>} />
                      <Route path="/daily-report" element={<ProtectedLayout><DailyReport /></ProtectedLayout>} />
                      <Route path="/purchase-entry" element={<ProtectedLayout><PurchaseEntry /></ProtectedLayout>} />
                      <Route path="/purchase-history" element={<ProtectedLayout><PurchaseEntry /></ProtectedLayout>} />
                      <Route path="/items" element={<ProtectedLayout><ManageItems /></ProtectedLayout>} />
                      <Route path="/customers" element={<ProtectedLayout><CustomerList /></ProtectedLayout>} />
                      <Route path="/add-expenses" element={<ProtectedLayout><AddExpenses /></ProtectedLayout>} />
                      <Route path="/add-employee" element={<SuperAdminRoute><ProtectedLayout><AddEmployee /></ProtectedLayout></SuperAdminRoute>} />
                      <Route path="/bill-trash" element={<SuperAdminRoute><ProtectedLayout><BillTrash /></ProtectedLayout></SuperAdminRoute>} />

                      <Route path="/reports" element={<ProtectedLayout><PlaceholderPage title="Payment Reports" /></ProtectedLayout>} />
                      <Route path="/suppliers" element={<ProtectedLayout><PlaceholderPage title="Suppliers" /></ProtectedLayout>} />
                      <Route path="/stock" element={<ProtectedLayout><PlaceholderPage title="Manage Stock" /></ProtectedLayout>} />
                      <Route path="/categories" element={<ProtectedLayout><PlaceholderPage title="Categories" /></ProtectedLayout>} />
                      <Route path="/pricing" element={<ProtectedLayout><PlaceholderPage title="Pricing Setup" /></ProtectedLayout>} />
                      <Route path="/add-customer" element={<ProtectedLayout><PlaceholderPage title="Add Customer" /></ProtectedLayout>} />
                      <Route path="/settings" element={<ProtectedLayout><PlaceholderPage title="Settings" /></ProtectedLayout>} />
                      <Route path="/profile" element={<ProtectedLayout><PlaceholderPage title="User Profile" /></ProtectedLayout>} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </CustomerProvider>
            </ItemProvider>
          </PurchaseProvider>
        </QuotationProvider>
      </InvoiceProvider>
    </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
