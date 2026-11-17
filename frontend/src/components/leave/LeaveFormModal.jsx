import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import api, { getErrorMessage } from '../../services/api';

const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
  'Unpaid Leave',
  'Maternity Leave',
  'Paternity Leave',
];

export default function LeaveFormModal({ isOpen, onClose, onSubmitted }) {
  const [file, setFile] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      leaveType: 'Casual Leave',
      startDate: '',
      endDate: '',
      reason: '',
    },
  });

  const startDate = watch('startDate');

  const onSubmit = async (values) => {
    try {
      const formData = new FormData();
      formData.append('leaveType', values.leaveType);
      formData.append('startDate', values.startDate);
      formData.append('endDate', values.endDate);
      formData.append('reason', values.reason);
      if (file) formData.append('supportingDocument', file);

      await api.post('/leaves', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Leave request submitted');
      reset();
      setFile(null);
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply for Leave" subtitle="Overlapping dates and leave balances are automatically validated." size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label-text">Leave Type *</label>
          <select className="input-field" {...register('leaveType', { required: true })}>
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-text">Start Date *</label>
            <input type="date" className="input-field" {...register('startDate', { required: 'Start date is required' })} />
            {errors.startDate && <p className="text-xs text-red-600 mt-1">{errors.startDate.message}</p>}
          </div>
          <div>
            <label className="label-text">End Date *</label>
            <input
              type="date"
              className="input-field"
              min={startDate || undefined}
              {...register('endDate', {
                required: 'End date is required',
                validate: (val) => !startDate || val >= startDate || 'End date must be on or after start date',
              })}
            />
            {errors.endDate && <p className="text-xs text-red-600 mt-1">{errors.endDate.message}</p>}
          </div>
        </div>

        <div>
          <label className="label-text">Reason *</label>
          <textarea
            rows={3}
            className="input-field"
            placeholder="Provide brief context for your leave request..."
            {...register('reason', {
              required: 'Reason is required',
              minLength: { value: 3, message: 'Please provide at least 3 characters' },
            })}
          />
          {errors.reason && <p className="text-xs text-red-600 mt-1">{errors.reason.message}</p>}
        </div>

        <div>
          <label className="label-text">Supporting Document (Optional — PDF, DOC, JPG, PNG)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
