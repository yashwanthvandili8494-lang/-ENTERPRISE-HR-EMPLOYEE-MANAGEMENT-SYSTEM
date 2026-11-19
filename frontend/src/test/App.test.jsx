import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import Badge from '../components/common/Badge';
import PayrollFormModal from '../components/payroll/PayrollFormModal';
import LeaveFormModal from '../components/leave/LeaveFormModal';
import LiveClock from '../components/common/LiveClock';

// Mock AuthContext for LoginPage test
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    user: null,
    loading: false,
  }),
  ROLES: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    HR_MANAGER: 'HR_MANAGER',
    DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
    EMPLOYEE: 'EMPLOYEE',
  },
}));

describe('Frontend Component & Form Validation Tests', () => {
  it('validates required email and password fields on LoginPage', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('rejects malformed email on LoginPage', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('renders status Badge with appropriate styling', () => {
    render(<Badge status="Approved" />);
    const badge = screen.getByText('Approved');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('emerald');
  });

  it('computes Net Salary preview dynamically in PayrollFormModal', async () => {
    render(
      <PayrollFormModal
        isOpen
        onClose={vi.fn()}
        onSaved={vi.fn()}
        employees={[{ _id: '1', employeeId: 'EMP-1', firstName: 'Jane', lastName: 'Doe', salary: { basic: 5000, hra: 1000, otherAllowances: 500, deductions: 200 } }]}
      />
    );

    const numberInputs = screen.getAllByRole('spinbutton');
    // Inputs: year, basic, hra, otherAllowances, bonus, deductions
    fireEvent.change(numberInputs[1], { target: { value: '6000' } }); // Basic
    fireEvent.change(numberInputs[2], { target: { value: '1500' } }); // HRA
    fireEvent.change(numberInputs[3], { target: { value: '500' } }); // Allowances
    fireEvent.change(numberInputs[4], { target: { value: '300' } }); // Bonus
    fireEvent.change(numberInputs[5], { target: { value: '400' } }); // Deductions

    // 6000 + 1500 + 500 + 300 - 400 = ₹7,900.00
    await waitFor(() => {
      expect(screen.getByText('₹7,900.00')).toBeInTheDocument();
    });
  });

  it('validates required fields in LeaveFormModal', async () => {
    render(<LeaveFormModal isOpen onClose={vi.fn()} onSubmitted={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /submit leave request/i }));

    await waitFor(() => {
      expect(screen.getByText(/start date is required/i)).toBeInTheDocument();
      expect(screen.getByText(/end date is required/i)).toBeInTheDocument();
      expect(screen.getByText(/reason is required/i)).toBeInTheDocument();
    });
  });

  it('renders LiveClock with live system clock indicator and shift elapsed timer', () => {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    render(<LiveClock timezone="Asia/Kolkata" checkedInAt={oneHourAgo} checkedOutAt={null} />);

    expect(screen.getByText(/Live System Clock/i)).toBeInTheDocument();
    expect(screen.getByText(/Shift Elapsed \(Live\)/i)).toBeInTheDocument();
  });
});
