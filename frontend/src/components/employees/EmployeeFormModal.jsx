import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import api, { getErrorMessage } from '../../services/api';

export default function EmployeeFormModal({ isOpen, onClose, employee = null, departments = [], managers = [], onSaved }) {
  const isEdit = Boolean(employee);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const createAccount = watch('createUserAccount');

  useEffect(() => {
    if (isOpen) {
      if (employee) {
        reset({
          employeeId: employee.employeeId || '',
          firstName: employee.firstName || '',
          lastName: employee.lastName || '',
          email: employee.email || '',
          phone: employee.phone || '',
          gender: employee.gender || 'Prefer Not to Say',
          dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().slice(0, 10) : '',
          department: employee.department?._id || employee.department || '',
          designation: employee.designation || '',
          joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().slice(0, 10) : '',
          employmentType: employee.employmentType || 'Full-Time',
          reportingManager: employee.reportingManager?._id || employee.reportingManager || '',
          employmentStatus: employee.employmentStatus || 'Active',
          street: employee.address?.street || '',
          city: employee.address?.city || '',
          state: employee.address?.state || '',
          postalCode: employee.address?.postalCode || '',
          country: employee.address?.country || '',
          basic: employee.salary?.basic ?? 0,
          hra: employee.salary?.hra ?? 0,
          otherAllowances: employee.salary?.otherAllowances ?? 0,
          deductions: employee.salary?.deductions ?? 0,
          currency: employee.salary?.currency || 'INR',
          emergencyName: employee.emergencyContact?.name || '',
          emergencyRelationship: employee.emergencyContact?.relationship || '',
          emergencyPhone: employee.emergencyContact?.phone || '',
        });
      } else {
        reset({
          employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          gender: 'Prefer Not to Say',
          dateOfBirth: '',
          department: departments[0]?._id || '',
          designation: '',
          joiningDate: new Date().toISOString().slice(0, 10),
          employmentType: 'Full-Time',
          reportingManager: '',
          employmentStatus: 'Active',
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          basic: 50000,
          hra: 15000,
          otherAllowances: 5000,
          deductions: 3000,
          currency: 'INR',
          emergencyName: '',
          emergencyRelationship: '',
          emergencyPhone: '',
          createUserAccount: false,
          accountRole: 'EMPLOYEE',
          accountPassword: '',
        });
      }
    }
  }, [isOpen, employee, departments, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        employeeId: values.employeeId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth || null,
        department: values.department,
        designation: values.designation,
        joiningDate: values.joiningDate,
        employmentType: values.employmentType,
        reportingManager: values.reportingManager || null,
        employmentStatus: values.employmentStatus,
        address: {
          street: values.street,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode,
          country: values.country,
        },
        salary: {
          basic: Number(values.basic) || 0,
          hra: Number(values.hra) || 0,
          otherAllowances: Number(values.otherAllowances) || 0,
          deductions: Number(values.deductions) || 0,
          currency: values.currency || 'INR',
        },
        emergencyContact: {
          name: values.emergencyName,
          relationship: values.emergencyRelationship,
          phone: values.emergencyPhone,
        },
      };

      if (!isEdit && values.createUserAccount) {
        payload.createUserAccount = true;
        payload.accountRole = values.accountRole;
        payload.accountPassword = values.accountPassword;
      }

      if (isEdit) {
        await api.put(`/employees/${employee._id}`, payload);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/employees', payload);
        toast.success('Employee added successfully');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Employee (${employee?.employeeId})` : 'Add New Employee'}
      subtitle="All fields are validated server-side and recorded in the audit log."
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Core Identity */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-3">Personal &amp; Contact Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label-text">Employee ID *</label>
              <input className="input-field" {...register('employeeId', { required: 'Employee ID is required' })} />
              {errors.employeeId && <p className="text-xs text-red-600 mt-1">{errors.employeeId.message}</p>}
            </div>
            <div>
              <label className="label-text">First Name *</label>
              <input className="input-field" {...register('firstName', { required: 'First name is required' })} />
              {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label-text">Last Name *</label>
              <input className="input-field" {...register('lastName', { required: 'Last name is required' })} />
              {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="label-text">Email *</label>
              <input
                type="email"
                className="input-field"
                {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label-text">Phone *</label>
              <input className="input-field" {...register('phone', { required: 'Phone is required' })} />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label-text">Gender</label>
              <select className="input-field" {...register('gender')}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer Not to Say">Prefer Not to Say</option>
              </select>
            </div>
            <div>
              <label className="label-text">Date of Birth</label>
              <input type="date" className="input-field" {...register('dateOfBirth')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label-text">Street Address</label>
              <input className="input-field" {...register('street')} />
            </div>
            <div>
              <label className="label-text">City</label>
              <input className="input-field" {...register('city')} />
            </div>
            <div>
              <label className="label-text">State</label>
              <input className="input-field" {...register('state')} />
            </div>
            <div>
              <label className="label-text">Country</label>
              <input className="input-field" {...register('country')} />
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-3">Employment Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label-text">Department *</label>
              <select className="input-field" {...register('department', { required: 'Department is required' })}>
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.department && <p className="text-xs text-red-600 mt-1">{errors.department.message}</p>}
            </div>
            <div>
              <label className="label-text">Designation *</label>
              <input className="input-field" {...register('designation', { required: 'Designation is required' })} />
              {errors.designation && <p className="text-xs text-red-600 mt-1">{errors.designation.message}</p>}
            </div>
            <div>
              <label className="label-text">Joining Date *</label>
              <input type="date" className="input-field" {...register('joiningDate', { required: 'Joining date is required' })} />
            </div>
            <div>
              <label className="label-text">Employment Type</label>
              <select className="input-field" {...register('employmentType')}>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="label-text">Reporting Manager</label>
              <select className="input-field" {...register('reportingManager')}>
                <option value="">None</option>
                {managers
                  .filter((m) => !employee || m._id !== employee._id)
                  .map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.firstName} {m.lastName} ({m.employeeId})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label-text">Employment Status</label>
              <select className="input-field" {...register('employmentStatus')}>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Compensation & Emergency Contact */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-3">Salary Structure (Restricted)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="label-text">Basic</label>
              <input type="number" step="0.01" className="input-field" {...register('basic')} />
            </div>
            <div>
              <label className="label-text">HRA</label>
              <input type="number" step="0.01" className="input-field" {...register('hra')} />
            </div>
            <div>
              <label className="label-text">Allowances</label>
              <input type="number" step="0.01" className="input-field" {...register('otherAllowances')} />
            </div>
            <div>
              <label className="label-text">Deductions</label>
              <input type="number" step="0.01" className="input-field" {...register('deductions')} />
            </div>
            <div>
              <label className="label-text">Currency</label>
              <input className="input-field" {...register('currency')} />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-3">Emergency Contact</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label-text">Contact Name</label>
              <input className="input-field" {...register('emergencyName')} />
            </div>
            <div>
              <label className="label-text">Relationship</label>
              <input className="input-field" {...register('emergencyRelationship')} />
            </div>
            <div>
              <label className="label-text">Phone</label>
              <input className="input-field" {...register('emergencyPhone')} />
            </div>
          </div>
        </div>

        {!isEdit && (
          <div className="pt-4 border-t border-slate-200 bg-slate-50 -mx-6 px-6 py-4">
            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-blue-700" {...register('createUserAccount')} />
              Also provision a Portal Login Account for this employee
            </label>
            {createAccount && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Portal Role</label>
                  <select className="input-field" {...register('accountRole')}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="DEPARTMENT_MANAGER">Department Manager</option>
                    <option value="HR_MANAGER">HR Manager</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Initial Password *</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Minimum 8 characters"
                    {...register('accountPassword', {
                      required: createAccount ? 'Initial password is required' : false,
                      minLength: { value: 8, message: 'At least 8 characters' },
                    })}
                  />
                  {errors.accountPassword && <p className="text-xs text-red-600 mt-1">{errors.accountPassword.message}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
