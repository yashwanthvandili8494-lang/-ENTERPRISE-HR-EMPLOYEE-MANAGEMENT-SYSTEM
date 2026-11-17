import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#1d4ed8', '#0ea5e9', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#64748b'];

export default function DashboardCharts({ charts }) {
  if (!charts) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Employee Growth by Month */}
      <div className="card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Employee Growth by Month</h3>
          <p className="text-xs text-slate-500">Cumulative headcount and monthly new hires</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.employeeGrowth || []}>
              <defs>
                <linearGradient id="empGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="totalEmployees" name="Total Headcount" stroke="#1d4ed8" fill="url(#empGrowthGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="newHires" name="New Hires" stroke="#10b981" fill="none" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Attendance Statistics */}
      <div className="card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Attendance Statistics</h3>
          <p className="text-xs text-slate-500">Present, Late, Half-Day, and Absent logs</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.attendanceStats || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="halfDay" name="Half-Day" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Department-wise Employee Distribution */}
      <div className="card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Department-Wise Distribution</h3>
          <p className="text-xs text-slate-500">Active headcount across company departments</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={(charts.deptDistribution || []).filter((d) => d.employees > 0)}
                dataKey="employees"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={2}
              >
                {(charts.deptDistribution || []).map((entry, idx) => (
                  <Cell key={entry.code || idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Leave Statistics */}
      <div className="card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Leave Statistics</h3>
          <p className="text-xs text-slate-500">Breakdown by leave category and decision status</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.leaveStats || []} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis dataKey="leaveType" type="category" width={105} tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="approved" name="Approved" stackId="a" fill="#10b981" />
              <Bar dataKey="pending" name="Pending" stackId="a" fill="#f59e0b" />
              <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Monthly Recruitment Statistics */}
      <div className="card p-5 lg:col-span-2">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Monthly Recruitment Pipeline</h3>
          <p className="text-xs text-slate-500">Applications received, interviews conducted, and hires</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.recruitmentStats || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="applied" name="Applied" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="interviewed" name="Interviewed" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="hired" name="Hired" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
