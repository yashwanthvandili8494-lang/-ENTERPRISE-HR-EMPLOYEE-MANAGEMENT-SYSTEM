import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import api, { getErrorMessage } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function PayrollFormModal({ isOpen, onClose, payroll = null, employees = [], onSaved }) {
  const isEdit = Boolean(payroll);
  const now = new Date();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm();

  const selectedEmpId = watch('employee');
  const basic = Number(watch('basicSalary')) || 0;
  const hra = Number(watch('houseRentAllowance')) || 0;
  const other = Number(watch('otherAllowances')) || 0;
  const bonus = Number(watch('bonus')) || 0;
  const deductions = Number(watch('deductions')) || 0;
  const netPreview = basic + hra + other + bonus - deductions;

  useEffect(() => {
    if (isOpen) {
      if (payroll) {
        reset({
          employee: payroll.employee?._id || payroll.employee || '',
          month: payroll.month,
          year: payroll.year,
          basicSalary: payroll.basicSalary,
          houseRentAllowance: payroll.houseRentAllowance,
          otherAllowances: payroll.otherAllowances,
          bonus: payroll.bonus,
          deductions: payroll.deductions,
          paymentStatus: payroll.paymentStatus,
          paymentDate: payroll.paymentDate ? new Date(payroll.paymentDate).toISOString().slice(0, 10) : '',
          notes: payroll.notes || '',
        });
      } else {
        reset({
          employee: '',
          month: now.getUTCMonth() + 1,
          year: now.getUTCFullYear(),
          basicSalary: 0,
          houseRentAllowance: 0,
          otherAllowances: 0,
          bonus: 0,
          deductions: 0,
          paymentStatus: 'Pending',
          paymentDate: '',
          notes: '',
        });
      }
    }
  }, [isOpen, payroll, reset]);

  // Auto-fill base salary when selecting an employee for new payroll
  useEffect(() => {
    if (!isEdit && selectedEmpId) {
      const emp = employees.find((e) => e._id === selectedEmpId);
      if (emp?.salary) {
        setValue('basicSalary', emp.salary.basic || 0);
        setValue('houseRentAllowance', emp.salary.hra || 0);
        setValue('otherAllowances', emp.salary.otherAllowances || 0);
        setValue('deductions', emp.salary.deductions || 0);
      }
    }
  }, [selectedEmpId, isEdit, employees, setValue]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        month: Number(values.month),
        year: Number(values.year),
        basicSalary: Number(values.basicSalary) || 0,
        houseRentAllowance: Number(values.houseRentAllowance) || 0,
        otherAllowances: Number(values.otherAllowances) || 0,
        bonus: Number(values.bonus) || 0,
        deductions: Number(values.deductions) || 0,
        paymentDate: values.paymentDate || null,
      };
      if (isEdit) {
        await api.put(`/payroll/${payroll._id}`, payload);
        toast.success('Payroll record updated');
      } else {
        await api.post('/payroll', payload);
        toast.success('Payroll record created');
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
      title={isEdit ? `Edit Payroll (${payroll.salaryMonth})` : 'Create Payroll Record'}
      subtitle="Net Salary = Basic + HRA + Other Allowances + Bonus - Deductions"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="label-text">Employee *</label>
            <select className="input-field" disabled={isEdit} {...register('employee', { required: true })}>
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.firstName} {e.lastName} ({e.employeeId})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text">Month *</label>
            <select className="input-field" disabled={isEdit} {...register('month', { required: true })}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(Date.UTC(2026, i, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text">Year *</label>
            <input type="number" className="input-field" disabled={isEdit} {...register('year', { required: true })} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="label-text">Basic Salary</label>
            <input type="number" step="0.01" className="input-field" {...register('basicSalary')} />
          </div>
          <div>
            <label className="label-text">HRA</label>
            <input type="number" step="0.01" className="input-field" {...register('houseRentAllowance')} />
          </div>
          <div>
            <label className="label-text">Other Allowances</label>
            <input type="number" step="0.01" className="input-field" {...register('otherAllowances')} />
          </div>
          <div>
            <label className="label-text">Bonus</label>
            <input type="number" step="0.01" className="input-field" {...register('bonus')} />
          </div>
          <div>
            <label className="label-text">Deductions</label>
            <input type="number" step="0.01" className="input-field" {...register('deductions')} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-blue-900">Calculated Net Salary</span>
          <span className="text-xl font-bold text-blue-900">{formatCurrency(netPreview)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-text">Payment Status</label>
            <select className="input-field" {...register('paymentStatus')}>
              <option value="Pending">Pending</option>
              <option value="Processed">Processed</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="label-text">Payment Date</label>
            <input type="date" className="input-field" {...register('paymentDate')} />
          </div>
        </div>

        <div>
          <label className="label-text">Notes</label>
          <textarea rows={2} className="input-field" {...register('notes')} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Payroll' : 'Save Payroll Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
