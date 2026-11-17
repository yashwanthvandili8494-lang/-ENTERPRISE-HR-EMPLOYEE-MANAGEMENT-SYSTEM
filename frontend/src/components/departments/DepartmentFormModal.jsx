import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import api, { getErrorMessage } from '../../services/api';

export default function DepartmentFormModal({ isOpen, onClose, department = null, employees = [], onSaved }) {
  const isEdit = Boolean(department);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    if (isOpen) {
      if (department) {
        reset({
          name: department.name,
          code: department.code,
          description: department.description || '',
          manager: department.manager?._id || department.manager || '',
          isActive: department.isActive,
        });
      } else {
        reset({ name: '', code: '', description: '', manager: '', isActive: true });
      }
    }
  }, [isOpen, department, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = { ...values, manager: values.manager || null };
      if (isEdit) {
        await api.put(`/departments/${department._id}`, payload);
        toast.success('Department updated');
      } else {
        await api.post('/departments', payload);
        toast.success('Department created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Department' : 'Create Department'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label-text">Department Name *</label>
            <input className="input-field" {...register('name', { required: 'Name is required' })} />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label-text">Code *</label>
            <input className="input-field uppercase" placeholder="e.g. ENG" {...register('code', { required: 'Code is required' })} />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
          </div>
        </div>

        <div>
          <label className="label-text">Department Manager</label>
          <select className="input-field" {...register('manager')}>
            <option value="">Unassigned</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.firstName} {e.lastName} ({e.employeeId})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-text">Description</label>
          <textarea rows={3} className="input-field" {...register('description')} />
        </div>

        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="rounded border-slate-300 text-blue-700" {...register('isActive')} />
            Active Department
          </label>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Department'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
