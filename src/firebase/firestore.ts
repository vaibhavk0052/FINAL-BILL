import {
  app,
  auth,
  db,
  firebaseConfig
} from './firebase.js';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  getAuth
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';

// ── Types ──
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'staff';
  phone?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  salary?: string;
  status: 'Active' | 'Inactive';
}

export interface Bill {
  id: string;
  customerName: string;
  amount: number;
  status: 'completed' | 'pending';
  date: string;
  createdBy?: string;
  invoiceNumber?: string;
  customerPhone?: string;
}

export interface DailyReportData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
  invoices: number;
}

const isFirebaseConfigured = true;

// ── AUTHENTICATION API ──

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  let targetEmail = email.trim();
  if (!targetEmail.includes('@')) {
    targetEmail = targetEmail === 'superadmin' ? 'superadmin@photobill.com' : 'admin@photobill.com';
  }

  const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
  const uid = userCredential.user.uid;

  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        uid,
        name: data.name || (targetEmail.includes('superadmin') ? 'Super Admin' : 'Billing Manager'),
        email: data.email || targetEmail,
        role: data.role || (targetEmail.includes('superadmin') ? 'superadmin' : 'admin'),
        phone: data.phone || '',
        createdAt: data.createdAt || new Date().toISOString()
      } as UserProfile;
    } else {
      const isSuper = targetEmail.includes('superadmin');
      const role = isSuper ? 'superadmin' : 'admin';
      const profile: UserProfile = {
        uid,
        name: isSuper ? 'Super Admin' : 'Billing Manager',
        email: targetEmail,
        role,
        phone: '',
        createdAt: new Date().toISOString()
      };
      try {
        await setDoc(userDocRef, profile);
      } catch (setErr) {
        console.warn("Failed to write new user profile to Firestore (permission denied), proceeding with local profile:", setErr);
      }
      return profile;
    }
  } catch (err: any) {
    console.error("Firestore database permission issue, falling back to local auth profile:", err);

    // Determine the user's role from their email dynamically
    let role: 'superadmin' | 'admin' | 'staff' = 'admin';
    const isSuper = targetEmail.toLowerCase().includes('superadmin');
    const isStaff = targetEmail.toLowerCase().includes('staff') || targetEmail.toLowerCase().includes('employee');

    if (isSuper) {
      role = 'superadmin';
    } else if (isStaff) {
      role = 'staff';
    } else {
      role = 'admin';
    }

    const fallbackProfile: UserProfile = {
      uid,
      name: isSuper ? 'Super Admin' : targetEmail.split('@')[0].toUpperCase(),
      email: targetEmail,
      role,
      phone: '',
      createdAt: new Date().toISOString()
    };
    return fallbackProfile;
  }
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

// ── EMPLOYEE MANAGEMENT API ──

export const getEmployees = async (callback: (employees: Employee[]) => void): Promise<() => void> => {
  const q = collection(db, 'employees');
  return onSnapshot(q, (snapshot) => {
    const emps: Employee[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      emps.push({
        id: doc.id,
        name: data.employeeName || data.name || '',
        phone: data.employeePhone || data.phone || '',
        role: data.employeeRole || data.role || 'Staff',
        email: data.email || `${(data.employeeName || 'staff').toLowerCase().replace(/\s+/g, '')}@photobill.com`,
        status: data.status || 'Active'
      } as Employee);
    });
    callback(emps);
  });
};

export const addEmployee = async (employeeData: Omit<Employee, 'id'>): Promise<void> => {
  const employeeId = 'emp-' + Math.random().toString(36).substr(2, 9);

  const newEmployee = {
    employeeName: employeeData.name,
    employeePhone: employeeData.phone,
    employeeRole: employeeData.role,
    status: employeeData.status || 'Active'
  };

  await setDoc(doc(db, 'employees', employeeId), newEmployee);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'employees', id));
};

export const updateEmployee = async (id: string, updatedData: Partial<Omit<Employee, 'id'>>): Promise<void> => {
  const empRef = doc(db, 'employees', id);
  const dataToUpdate: any = {};
  if (updatedData.name !== undefined) dataToUpdate.employeeName = updatedData.name;
  if (updatedData.phone !== undefined) dataToUpdate.employeePhone = updatedData.phone;
  if (updatedData.role !== undefined) dataToUpdate.employeeRole = updatedData.role;
  if (updatedData.status !== undefined) dataToUpdate.status = updatedData.status;

  await updateDoc(empRef, dataToUpdate);
};

// ── BILLS & SALES INVOICES API ──

export const listenToBills = (callback: (bills: Bill[]) => void): (() => void) => {
  const q = collection(db, 'bills');
  return onSnapshot(q, (snapshot) => {
    const billsList: Bill[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      billsList.push({
        id: doc.id,
        customerName: data.customerName || '',
        customerPhone: data.customerPhone || '',
        amount: data.totalAmount || data.amount || 0,
        status: data.paymentStatus || data.status || 'pending',
        date: data.createdAt ? data.createdAt.split('T')[0] : (data.date || new Date().toISOString().split('T')[0]),
        createdBy: data.createdBy || '',
        invoiceNumber: data.invoiceNumber || '',
        ...data
      } as any);
    });
    callback(billsList);
  });
};

export const addBillToFirestore = async (billData: any, customId?: string): Promise<void> => {
  const id = customId || 'bill-' + Math.random().toString(36).substr(2, 9);
  const billDocRef = doc(db, 'bills', id);
  const docSnap = await getDoc(billDocRef);
  const isNew = !docSnap.exists();

  const completeBill = {
    customerName: billData.customerName || '',
    customerPhone: billData.customerPhone || billData.customerEmail || '',
    invoiceNumber: billData.invoiceNumber || '',
    items: billData.items || [],
    subtotal: billData.subtotal || billData.amount || 0,
    discount: billData.discount || 0,
    taxableAmount: billData.taxableAmount || 0,
    gstEnabled: billData.gstEnabled !== undefined ? billData.gstEnabled : true,
    gstAmount: billData.gstAmount || billData.tax || 0,
    totalAmount: billData.totalAmount || billData.amount || 0,
    cashAmount: billData.cashAmount || 0,
    onlineAmount: billData.onlineAmount || 0,
    advanceAmount: billData.advanceAmount || 0,
    advanceMethod: billData.advanceMethod || 'cash',
    remainingAmount: billData.remainingAmount || 0,
    paymentStatus: billData.paymentStatus || billData.status || 'pending',
    createdAt: billData.createdAt || billData.date || new Date().toISOString(),
    createdBy: billData.createdBy || 'System',
    createdByRole: billData.createdByRole || 'Staff',
    createdByPhone: billData.createdByPhone || '',
    isPrivate: billData.isPrivate || false,
    isImp: billData.isImp || false,
    isWorkDone: billData.isWorkDone || false,
    workDoneBy: billData.workDoneBy || '',
    workDoneAt: billData.workDoneAt || '',
    paymentHistory: billData.paymentHistory || [],
    isDelivered: billData.isDelivered || false,
    isDeleted: billData.isDeleted || false,
    deletedAt: billData.deletedAt || null
  };

  await setDoc(billDocRef, completeBill);

  await setDoc(doc(db, 'salesHistory', id), {
    customerName: completeBill.customerName,
    invoiceNo: completeBill.invoiceNumber,
    amount: completeBill.totalAmount,
    paymentStatus: completeBill.paymentStatus,
    saleDate: (completeBill.createdAt && typeof completeBill.createdAt === 'string') ? completeBill.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
    createdBy: completeBill.createdBy
  });

  if (isNew) {
    await recordInvoiceInDailyReports(completeBill.totalAmount, completeBill.paymentStatus === 'completed' ? completeBill.totalAmount : 0, 0);
  }
};

export const softDeleteBillInFirestore = async (
  id: string,
  deletedBy?: string,
  deletedByRole?: string,
  deletedByPhone?: string
): Promise<void> => {
  try {
    const billDocRef = doc(db, 'bills', id);
    const billSnap = await getDoc(billDocRef);
    if (billSnap.exists()) {
      const data = billSnap.data();
      
      // Only subtract from daily reports if not already deleted
      if (!data.isDeleted) {
        const amount = data.totalAmount || data.amount || 0;
        const dateStr = data.createdAt ? data.createdAt.split('T')[0] : (data.date || new Date().toISOString().split('T')[0]);
        await subtractInvoiceFromDailyReports(amount, dateStr);
      }

      await updateDoc(billDocRef, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        createdByRole: deletedByRole || 'Staff',
        createdByPhone: deletedByPhone || '',
        createdBy: deletedBy || 'System'
      });
    }
  } catch (err) {
    console.error("Error soft deleting bill in Firestore:", err);
  }
};

export const restoreBillInFirestore = async (id: string): Promise<void> => {
  try {
    const billDocRef = doc(db, 'bills', id);
    const billSnap = await getDoc(billDocRef);
    if (billSnap.exists()) {
      const data = billSnap.data();
      
      // Only add back to daily reports if it was indeed soft deleted
      if (data.isDeleted) {
        const amount = data.totalAmount || data.amount || 0;
        const paymentStatus = data.paymentStatus || data.status || 'pending';
        await recordInvoiceInDailyReports(amount, paymentStatus === 'completed' ? amount : 0, 0);
      }

      await updateDoc(billDocRef, {
        isDeleted: false,
        deletedAt: null
      });
    }
  } catch (err) {
    console.error("Error restoring bill in Firestore:", err);
  }
};

export const deleteBillFromFirestore = async (id: string): Promise<void> => {
  try {
    const billDocRef = doc(db, 'bills', id);
    const billSnap = await getDoc(billDocRef);
    if (billSnap.exists()) {
      const data = billSnap.data();
      // Only subtract from reports if the bill was NOT already soft-deleted!
      if (!data.isDeleted) {
        const amount = data.totalAmount || data.amount || 0;
        const dateStr = data.createdAt ? data.createdAt.split('T')[0] : (data.date || new Date().toISOString().split('T')[0]);
        await subtractInvoiceFromDailyReports(amount, dateStr);
      }
    }
    await deleteDoc(billDocRef);
    await deleteDoc(doc(db, 'salesHistory', id));
  } catch (err) {
    console.error("Error deleting bill from Firestore:", err);
  }
};

// ── DAILY REPORT & METRICS API ──

export const listenToDailyReports = (callback: (reports: DailyReportData[]) => void): (() => void) => {
  const q = query(collection(db, 'dailyReports'), orderBy('reportDate', 'desc'), limit(7));
  return onSnapshot(q, (snapshot) => {
    const reportsList: DailyReportData[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      reportsList.push({
        date: data.reportDate || data.date || '',
        revenue: data.totalRevenue || data.revenue || 0,
        expenses: data.totalExpenses || data.expenses || 0,
        profit: data.totalProfit || data.profit || 0,
        invoices: data.totalInvoices || data.invoices || 0
      } as DailyReportData);
    });
    reportsList.sort((a, b) => a.date.localeCompare(b.date));
    callback(reportsList);
  });
};

export const addExpenseToFirestore = async (amount: number, dateStr: string): Promise<void> => {
  const reportRef = doc(db, 'dailyReports', dateStr);
  const reportSnap = await getDoc(reportRef);
  if (reportSnap.exists()) {
    const data = reportSnap.data();
    const newExpenses = (data.totalExpenses || data.expenses || 0) + amount;
    const totalRev = data.totalRevenue || data.revenue || 0;
    await updateDoc(reportRef, {
      totalExpenses: newExpenses,
      totalProfit: totalRev - newExpenses,
      generatedAt: new Date().toISOString()
    });
  } else {
    await setDoc(reportRef, {
      totalRevenue: 0,
      totalSales: 0,
      totalExpenses: amount,
      totalProfit: -amount,
      totalInvoices: 0,
      reportDate: dateStr,
      generatedAt: new Date().toISOString()
    });
  }
};

export const subtractExpenseFromDailyReport = async (amount: number, dateStr: string): Promise<void> => {
  const reportRef = doc(db, 'dailyReports', dateStr);
  const reportSnap = await getDoc(reportRef);
  if (reportSnap.exists()) {
    const data = reportSnap.data();
    const currentExpenses = data.totalExpenses || data.expenses || 0;
    const newExpenses = Math.max(0, currentExpenses - amount);
    const totalRev = data.totalRevenue || data.revenue || 0;
    await updateDoc(reportRef, {
      totalExpenses: newExpenses,
      totalProfit: totalRev - newExpenses,
      generatedAt: new Date().toISOString()
    });
  }
};

export const subtractInvoiceFromDailyReports = async (amount: number, dateStr: string): Promise<void> => {
  try {
    const reportRef = doc(db, 'dailyReports', dateStr);
    const reportSnap = await getDoc(reportRef);
    if (reportSnap.exists()) {
      const data = reportSnap.data();
      const currentRev = data.totalRevenue || data.revenue || 0;
      const currentInvoices = data.totalInvoices || data.invoices || 0;
      const newRev = Math.max(0, currentRev - amount);
      const newInvoices = Math.max(0, currentInvoices - 1);
      const currentExp = data.totalExpenses || data.expenses || 0;
      await updateDoc(reportRef, {
        totalRevenue: newRev,
        totalSales: newRev,
        totalProfit: newRev - currentExp,
        totalInvoices: newInvoices,
        generatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Error subtracting invoice from daily reports:", err);
  }
};

const recordInvoiceInDailyReports = async (amount: number, paidAmount: number, expenseAmount: number): Promise<void> => {
  const dateStr = new Date().toISOString().split('T')[0];
  const reportRef = doc(db, 'dailyReports', dateStr);
  const reportSnap = await getDoc(reportRef);

  if (reportSnap.exists()) {
    const data = reportSnap.data();
    const newRev = (data.totalRevenue || data.revenue || 0) + amount;
    const newExp = (data.totalExpenses || data.expenses || 0) + expenseAmount;
    await updateDoc(reportRef, {
      totalRevenue: newRev,
      totalSales: newRev,
      totalExpenses: newExp,
      totalProfit: newRev - newExp,
      totalInvoices: (data.totalInvoices || data.invoices || 0) + 1,
      generatedAt: new Date().toISOString()
    });
  } else {
    await setDoc(reportRef, {
      totalRevenue: amount,
      totalSales: amount,
      totalExpenses: expenseAmount,
      totalProfit: amount - expenseAmount,
      totalInvoices: 1,
      reportDate: dateStr,
      generatedAt: new Date().toISOString()
    });
  }
};

// Sync whole database helper for initial transition
export const syncInvoicesToFirestore = async (invoices: any[]): Promise<void> => {
  for (const inv of invoices) {
    if (inv.isDeleted) continue;
    await addBillToFirestore(inv, inv.id);
  }
  // Automatically audit and rebuild the daily reports from active invoices & expenses
  await rebuildDailyReportsFromActiveInvoices(invoices.filter(i => !i.isDeleted));
};

export const rebuildDailyReportsFromActiveInvoices = async (activeInvoices: any[]): Promise<void> => {
  try {
    // 1. Fetch all existing dailyReport docs to clear them
    const reportsCol = collection(db, 'dailyReports');
    const reportsSnap = await getDocs(reportsCol);

    // We can use a batch delete to clear all daily report docs
    const batch = writeBatch(db);
    reportsSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();

    // 2. Group active invoices by date
    const dailyMap: { [key: string]: { revenue: number; invoices: number } } = {};
    activeInvoices.forEach(inv => {
      const dateStr = inv.createdAt ? inv.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { revenue: 0, invoices: 0 };
      }
      dailyMap[dateStr].revenue += inv.totalAmount;
      dailyMap[dateStr].invoices += 1;
    });

    // 3. Group expenses by date (from active purchases/expenses)
    const expensesCol = collection(db, 'expenses');
    const expensesSnap = await getDocs(expensesCol);
    const expensesMap: { [key: string]: number } = {};
    expensesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const dateStr = data.expenseDate || data.date || '';
      if (dateStr) {
        expensesMap[dateStr] = (expensesMap[dateStr] || 0) + (data.expenseAmount || data.amount || 0);
      }
    });

    // 4. Create correct clean daily report documents in Firestore
    const allDates = new Set([...Object.keys(dailyMap), ...Object.keys(expensesMap)]);

    for (const dateStr of allDates) {
      const billData = dailyMap[dateStr] || { revenue: 0, invoices: 0 };
      const expenseAmount = expensesMap[dateStr] || 0;

      await setDoc(doc(db, 'dailyReports', dateStr), {
        totalRevenue: billData.revenue,
        totalSales: billData.revenue,
        totalExpenses: expenseAmount,
        totalProfit: billData.revenue - expenseAmount,
        totalInvoices: billData.invoices,
        reportDate: dateStr,
        generatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Error rebuilding daily reports:", err);
  }
};

// ── MANAGE ITEMS inventory API ──

export const listenToItems = (callback: (items: any[]) => void): (() => void) => {
  const q = collection(db, 'manageItems');
  return onSnapshot(q, (snapshot) => {
    const itemsList: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      itemsList.push({
        id: doc.id,
        itemName: data.itemName || '',
        price: data.itemPrice || data.price || 0,
        itemCategory: data.itemCategory || 'General',
        itemStock: data.itemStock || 100,
        itemImage: data.itemImage || '',
        itemDescription: data.itemDescription || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      });
    });
    callback(itemsList);
  });
};

export const addItemToFirestore = async (item: any): Promise<void> => {
  await setDoc(doc(db, 'manageItems', item.id), {
    itemName: item.itemName,
    itemCategory: item.itemCategory || 'General',
    itemPrice: item.price || 0,
    itemStock: item.itemStock || 100,
    itemImage: item.itemImage || '',
    itemDescription: item.itemDescription || '',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
};

export const deleteItemFromFirestore = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'manageItems', id));
};

// ── PURCHASES API ──

export const listenToPurchases = (callback: (purchases: any[]) => void): (() => void) => {
  const q = collection(db, 'purchaseEntry');
  return onSnapshot(q, (snapshot) => {
    const purchasesList: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      purchasesList.push({
        id: doc.id,
        supplierName: data.supplierName || '',
        itemName: data.productName || '',
        quantity: data.quantity || 0,
        price: data.price || 0,
        totalAmount: (data.price || 0) * (data.quantity || 0),
        date: data.purchaseDate || ''
      });
    });
    callback(purchasesList);
  });
};

export const addPurchaseToFirestore = async (purchase: any): Promise<void> => {
  const purchaseId = purchase.id;
  const totalAmount = purchase.price * purchase.quantity;

  await setDoc(doc(db, 'purchaseEntry', purchaseId), {
    supplierName: purchase.supplierName,
    productName: purchase.itemName,
    price: purchase.price,
    quantity: purchase.quantity,
    purchaseDate: purchase.date
  });

  await setDoc(doc(db, 'purchaseHistory', purchaseId), {
    purchaseId: purchaseId,
    supplierName: purchase.supplierName,
    amount: totalAmount,
    date: purchase.date,
    total: purchase.totalAmount || totalAmount
  });

  // Automatically insert/sync this purchase in the 'expenses' collection so it tallies
  await setDoc(doc(db, 'expenses', 'pur-' + purchaseId), {
    expenseTitle: `Purchase: ${purchase.itemName} from ${purchase.supplierName}`,
    expenseAmount: totalAmount,
    expenseCategory: 'Purchase',
    expenseDate: purchase.date,
    note: `Automated tally from Supplier Purchase entry (Qty: ${purchase.quantity})`,
    addedBy: 'System',
    createdAt: new Date().toISOString()
  });

  await addExpenseToFirestore(totalAmount, purchase.date);
};

export const deletePurchaseFromFirestore = async (id: string): Promise<void> => {
  try {
    const purchaseDocRef = doc(db, 'purchaseEntry', id);
    const purchaseSnap = await getDoc(purchaseDocRef);
    if (purchaseSnap.exists()) {
      const data = purchaseSnap.data();
      const price = data.price || 0;
      const quantity = data.quantity || 0;
      const totalAmount = price * quantity;
      const purchaseDate = data.purchaseDate || '';

      if (purchaseDate) {
        await subtractExpenseFromDailyReport(totalAmount, purchaseDate);
      }
    }

    await deleteDoc(doc(db, 'purchaseEntry', id));
    await deleteDoc(doc(db, 'purchaseHistory', id));
    await deleteDoc(doc(db, 'expenses', 'pur-' + id));
  } catch (err) {
    console.error("Error in deletePurchaseFromFirestore:", err);
  }
};

// ── EXPENSES API ──

export const listenToExpenses = (callback: (expenses: any[]) => void): (() => void) => {
  const q = collection(db, 'expenses');
  return onSnapshot(q, (snapshot) => {
    const expensesList: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      expensesList.push({
        id: doc.id,
        date: data.expenseDate || data.date || '',
        description: data.expenseTitle || data.description || '',
        amount: data.expenseAmount || data.amount || 0,
        category: data.expenseCategory || data.category || 'General',
        note: data.note || '',
        addedBy: data.addedBy || 'Admin',
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    expensesList.sort((a, b) => b.date.localeCompare(a.date));
    callback(expensesList);
  });
};

export const addExpenseRecordToFirestore = async (expense: any): Promise<void> => {
  await setDoc(doc(db, 'expenses', expense.id), {
    expenseTitle: expense.description || expense.expenseTitle,
    expenseAmount: expense.amount || expense.expenseAmount,
    expenseCategory: expense.category || expense.expenseCategory,
    expenseDate: expense.date || expense.expenseDate,
    note: expense.note || '',
    addedBy: expense.addedBy || 'Admin',
    createdAt: new Date().toISOString()
  });

  await addExpenseToFirestore(expense.amount || expense.expenseAmount, expense.date || expense.expenseDate);
};

export const deleteExpenseRecordFromFirestore = async (id: string): Promise<void> => {
  try {
    const expenseDocRef = doc(db, 'expenses', id);
    const expenseSnap = await getDoc(expenseDocRef);
    if (expenseSnap.exists()) {
      const data = expenseSnap.data();
      const amount = data.expenseAmount || data.amount || 0;
      const date = data.expenseDate || data.date || '';
      if (date) {
        await subtractExpenseFromDailyReport(amount, date);
      }
    }

    // Delete the expense document itself
    await deleteDoc(expenseDocRef);

    // Two-way cascade: if this is a linked purchase, delete it from purchase records
    if (id.startsWith('pur-')) {
      const purchaseId = id.replace('pur-', '');
      await deleteDoc(doc(db, 'purchaseEntry', purchaseId));
      await deleteDoc(doc(db, 'purchaseHistory', purchaseId));
    }
  } catch (err) {
    console.error("Error in deleteExpenseRecordFromFirestore:", err);
  }
};

// ── DASHBOARD STATS SYNC API ──

export const updateDashboardAnalytics = async (stats: {
  totalRevenue: number;
  completedAmount: number;
  pendingAmount: number;
  totalExpenses: number;
  totalInvoices: number;
  netProfit: number;
}): Promise<void> => {
  try {
    await setDoc(doc(db, 'dashboard', 'analytics'), stats);
  } catch (err) {
    console.error("Error updating dashboard analytics:", err);
  }
};

// ── QUOTATION API ──

export interface QuotationItem {
  name: string;
  quantity: number;
  price: number;
  description?: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  description?: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  gstEnabled: boolean;
  gstAmount: number;
  totalAmount: number;
  createdAt: string;
  createdBy?: string;
  createdByRole?: string;
  createdByPhone?: string;
  status?: 'pending' | 'done';
}

export const listenToQuotations = (callback: (quotations: Quotation[]) => void): (() => void) => {
  const q = collection(db, 'quotations');
  return onSnapshot(q, (snapshot) => {
    const list: Quotation[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      list.push({
        id: doc.id,
        quotationNumber: data.quotationNumber || '',
        customerName: data.customerName || '',
        customerPhone: data.customerPhone || '',
        customerEmail: data.customerEmail || '',
        description: data.description || '',
        items: data.items || [],
        subtotal: data.subtotal || 0,
        discount: data.discount || 0,
        taxableAmount: data.taxableAmount || 0,
        gstEnabled: data.gstEnabled || false,
        gstAmount: data.gstAmount || 0,
        totalAmount: data.totalAmount || 0,
        createdAt: data.createdAt || new Date().toISOString(),
        createdBy: data.createdBy || '',
        createdByRole: data.createdByRole || '',
        createdByPhone: data.createdByPhone || '',
        status: data.status || 'pending'
      });
    });
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(list);
  });
};

export const addQuotationToFirestore = async (qData: Quotation, customId?: string): Promise<void> => {
  const id = customId || qData.id || 'qtn-' + Math.random().toString(36).substr(2, 9);
  await setDoc(doc(db, 'quotations', id), {
    ...qData,
    id
  });
};

export const deleteQuotationFromFirestore = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'quotations', id));
};

export { isFirebaseConfigured, auth, db };
