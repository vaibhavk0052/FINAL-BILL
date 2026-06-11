import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  UserPlus, Mail, Lock, Phone, CircleDollarSign, CheckCircle2, 
  XCircle, UserCheck, ShieldAlert, ArrowRight, ClipboardList, Trash2, Edit2
} from 'lucide-react';
import { getEmployees, addEmployee, deleteEmployee, updateEmployee, Employee } from '@/firebase/firestore';

export default function AddEmployee() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Staff');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Subscribe to employees real-time feed
  useEffect(() => {
    let unsubscribe = () => {};
    const initFeed = async () => {
      try {
        unsubscribe = await getEmployees((data) => {
          // Filter out system default users — show only manually added employees
          const filtered = data.filter(
            e => e.id !== 'mock-superadmin-uid' && e.id !== 'mock-admin-uid'
          );
          setEmployees(filtered);
        });
      } catch (err) {
        console.error("Failed to load employees:", err);
        toast.error("Failed to load employees list");
      }
    };
    initFeed();
    return () => unsubscribe();
  }, []);

  const handleEditClick = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setPhone(emp.phone);
    setRole(emp.role);
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setName('');
    setPhone('');
    setRole('Staff');
  };

  const handleDeleteClick = async (id: string, empName: string) => {
    if (window.confirm(`Are you sure you want to delete employee: ${empName}?`)) {
      try {
        await deleteEmployee(id);
        toast.success(`Successfully deleted employee: ${empName}`);
        if (editingEmployee?.id === id) {
          handleCancelEdit();
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to delete employee");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      toast.error("Please fill in all required fields (Name, Phone)");
      return;
    }

    if (phone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    setLoading(true);
    try {
      if (editingEmployee) {
        // Edit flow
        await updateEmployee(editingEmployee.id, {
          name: name.trim(),
          phone: phone.trim(),
          role,
          status: 'Active'
        });
        toast.success(`Successfully updated employee: ${name}`);
        setEditingEmployee(null);
      } else {
        // Add flow
        await addEmployee({
          name: name.trim(),
          role,
          phone: phone.trim(),
          status: 'Active'
        });
        toast.success(`Successfully added employee: ${name}`);
      }
      
      // Reset form
      setName('');
      setPhone('');
      setRole('Staff');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit employee data");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 25 }
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-pink-500" />
          Employee Management
        </h1>
        <p className="text-sm text-slate-500 mt-2 font-medium">Add, register, and monitor your billing staff & administrators</p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 xl:grid-cols-3 gap-8"
      >
        {/* Registration Form Card */}
        <motion.div 
          variants={cardVariants}
          className="xl:col-span-1 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8"
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingEmployee ? 'Update roster profile details' : 'Creates credentials & profile'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Employee Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all"
                />
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Phone Number</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) {
                      setPhone(val);
                    }
                  }}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Role Box (Dropdown list of different roles) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Employee Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all"
              >
                <option value="Staff">Staff</option>
                <option value="Owner">Owner</option>
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-md hover:shadow-lg shadow-pink-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {editingEmployee ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  {editingEmployee ? 'Update Details' : 'Create Employee Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>

            {editingEmployee && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={handleCancelEdit}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all"
              >
                Cancel Edit
              </motion.button>
            )}

            {/* Info note */}
            <div className="mt-3 p-3 rounded-xl bg-violet-50 border border-violet-200/60">
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1">Bill Generator Info</p>
              <p className="text-[11px] text-violet-600 leading-relaxed">
                The <strong>Name</strong>, <strong>Role</strong> &amp; <strong>Phone No</strong> entered here will automatically show in the <em>"Bill Generated By"</em> card when this employee creates a bill.
              </p>
            </div>
          </form>
        </motion.div>

        {/* Employees List Card */}
        <motion.div 
          variants={cardVariants}
          className="xl:col-span-2 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8"
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800">Employee Roster</h2>
              <p className="text-xs text-slate-500">Total Registered Employees ({employees.length})</p>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ShieldAlert className="w-12 h-12 stroke-[1.5] mb-2" />
              <p className="font-medium text-sm">No employees registered yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pl-2">Employee Name</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3 pr-2 text-right">Phone</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pl-2 font-semibold text-slate-800">{emp.name}</td>
                      <td className="py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
                          emp.role === 'Owner'
                            ? 'bg-violet-50 text-violet-600 border border-violet-100' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-4 pr-2 text-right text-slate-600 font-medium">{emp.phone}</td>
                      <td className="py-4 text-right pr-2">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(emp)}
                            className="p-1.5 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(emp.id, emp.name)}
                            className="p-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
