import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  Briefcase,
  Calendar,
  Download,
  Edit,
  Plus,
  UserPlus,
  Users,
} from 'lucide-react';
import api, { downloadBlob, getErrorMessage } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { formatDate, formatDateTime } from '../../utils/formatters';

const CANDIDATE_STATUSES = ['Applied', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected', 'Hired'];

export default function RecruitmentPage() {
  const { hasRole, companySettings } = useAuth();
  const canManage = hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER);
  const tz = companySettings?.timezone || 'UTC';

  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [candModalOpen, setCandModalOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [feedbackInterview, setFeedbackInterview] = useState(null);
  const [convertCandidate, setConvertCandidate] = useState(null);

  const jobForm = useForm();
  const candForm = useForm();
  const interviewForm = useForm();
  const feedbackForm = useForm();
  const convertForm = useForm();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, candsRes, intRes, deptRes] = await Promise.all([
        api.get('/jobs?limit=50'),
        api.get('/candidates?limit=50'),
        api.get('/interviews?limit=50'),
        api.get('/departments?limit=50'),
      ]);
      setJobs(jobsRes.data.data || []);
      setCandidates(candsRes.data.data || []);
      setInterviews(intRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openJobModal = (job = null) => {
    setEditingJob(job);
    if (job) {
      jobForm.reset({
        title: job.title,
        department: job.department?._id || job.department,
        description: job.description,
        requiredSkills: (job.requiredSkills || []).join(', '),
        experience: job.experience,
        employmentType: job.employmentType,
        location: job.location,
        openingsCount: job.openingsCount,
        applicationDeadline: job.applicationDeadline ? new Date(job.applicationDeadline).toISOString().slice(0, 10) : '',
        status: job.status,
      });
    } else {
      jobForm.reset({
        title: '',
        department: departments[0]?._id || '',
        description: '',
        requiredSkills: '',
        experience: '3+ years',
        employmentType: 'Full-Time',
        location: 'Hybrid',
        openingsCount: 1,
        applicationDeadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        status: 'Open',
      });
    }
    setJobModalOpen(true);
  };

  const onSaveJob = async (values) => {
    try {
      if (editingJob) {
        await api.put(`/jobs/${editingJob._id}`, values);
        toast.success('Job opening updated');
      } else {
        await api.post('/jobs', values);
        toast.success('Job opening created');
      }
      setJobModalOpen(false);
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onSaveCandidate = async (values) => {
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined && v !== null) formData.append(k, v);
      });
      if (resumeFile) formData.append('resume', resumeFile);
      await api.post('/candidates', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Candidate added');
      setCandModalOpen(false);
      setResumeFile(null);
      candForm.reset();
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCandidateStatusChange = async (candId, newStatus) => {
    try {
      await api.put(`/candidates/${candId}`, { status: newStatus });
      toast.success(`Candidate marked ${newStatus}`);
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onScheduleInterview = async (values) => {
    try {
      await api.post('/interviews', {
        candidate: values.candidate,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        durationMinutes: Number(values.durationMinutes) || 60,
        mode: values.mode,
        locationOrLink: values.locationOrLink,
      });
      toast.success('Interview scheduled');
      setInterviewModalOpen(false);
      interviewForm.reset();
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onSaveInterviewFeedback = async (values) => {
    try {
      await api.put(`/interviews/${feedbackInterview._id}`, {
        status: values.status,
        rating: values.rating ? Number(values.rating) : null,
        feedback: values.feedback,
      });
      toast.success('Interview updated');
      setFeedbackInterview(null);
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onConvertCandidate = async (values) => {
    try {
      await api.post(`/candidates/${convertCandidate._id}/convert`, {
        employeeId: values.employeeId,
        designation: values.designation,
        joiningDate: values.joiningDate,
        basicSalary: Number(values.basicSalary) || 5000,
      });
      toast.success('Candidate converted to active Employee!');
      setConvertCandidate(null);
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recruitment &amp; Hiring</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage job openings, applicant pipelines, interviews, and onboarding.</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openJobModal(null)} className="btn-primary">
              <Plus className="w-4 h-4" /> Post Job
            </button>
            <button
              type="button"
              onClick={() => {
                candForm.reset({ job: jobs[0]?._id || '', status: 'Applied', experienceYears: 2 });
                setCandModalOpen(true);
              }}
              className="btn-secondary"
            >
              <UserPlus className="w-4 h-4" /> Add Candidate
            </button>
            <button
              type="button"
              onClick={() => {
                interviewForm.reset({ candidate: candidates[0]?._id || '', mode: 'Video', durationMinutes: 60 });
                setInterviewModalOpen(true);
              }}
              className="btn-secondary"
            >
              <Calendar className="w-4 h-4" /> Schedule Interview
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card p-2 inline-flex gap-1">
        {[
          { key: 'jobs', label: `Job Openings (${jobs.length})`, icon: Briefcase },
          { key: 'candidates', label: `Candidates (${candidates.length})`, icon: Users },
          { key: 'interviews', label: `Interviews (${interviews.length})`, icon: Calendar },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.key ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Loader text="Loading recruitment pipeline..." />
      ) : (
        <>
          {tab === 'jobs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {jobs.map((job) => (
                <div key={job._id} className="card p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-blue-700">{job.code}</span>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5">{job.title}</h3>
                        <p className="text-xs text-slate-500">
                          {job.department?.name} • {job.employmentType} • {job.location}
                        </p>
                      </div>
                      <Badge status={job.status} />
                    </div>
                    <p className="text-xs text-slate-600 mt-3 line-clamp-2">{job.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(job.requiredSkills || []).map((skill) => (
                        <span key={skill} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Exp: {job.experience} • Applicants: <strong>{job.candidateCount || 0}</strong> • Deadline:{' '}
                      {formatDate(job.applicationDeadline, tz)}
                    </span>
                    {canManage && (
                      <button type="button" onClick={() => openJobModal(job)} className="text-blue-700 font-semibold hover:underline inline-flex items-center gap-1">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'candidates' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Candidate</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Role Applied</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Experience</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {c.email} • {c.phone}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{c.job?.title || '—'}</p>
                          <p className="text-xs text-slate-500">{c.job?.department?.name || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{c.experienceYears} yrs</td>
                        <td className="px-4 py-3">
                          {canManage && !c.convertedEmployee ? (
                            <select
                              value={c.status}
                              onChange={(e) => handleCandidateStatusChange(c._id, e.target.value)}
                              className="input-field py-1 text-xs w-auto"
                            >
                              {CANDIDATE_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge status={c.status} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                          {c.resume?.filePath && (
                            <button
                              type="button"
                              onClick={() => downloadBlob(`/candidates/${c._id}/resume`, c.resume.fileName || 'resume.pdf')}
                              className="btn-secondary text-xs py-1 px-2.5"
                            >
                              <Download className="w-3.5 h-3.5" /> Resume
                            </button>
                          )}
                          {canManage && ['Selected', 'Hired'].includes(c.status) && !c.convertedEmployee && (
                            <button
                              type="button"
                              onClick={() => {
                                setConvertCandidate(c);
                                convertForm.reset({
                                  employeeId: `EMP-${Math.floor(2000 + Math.random() * 7999)}`,
                                  designation: c.job?.title || 'Associate',
                                  joiningDate: new Date().toISOString().slice(0, 10),
                                  basicSalary: 50000,
                                });
                              }}
                              className="btn-primary text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                            >
                              Convert to Employee
                            </button>
                          )}
                          {c.convertedEmployee && (
                            <span className="text-xs font-semibold text-emerald-700">
                              Onboarded ({c.convertedEmployee.employeeId})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'interviews' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Candidate</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Position</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Scheduled</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Mode</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Rating / Feedback</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {interviews.map((iv) => (
                      <tr key={iv._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {iv.candidate?.firstName} {iv.candidate?.lastName}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{iv.job?.title || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">{formatDateTime(iv.scheduledAt, tz)}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{iv.mode} ({iv.durationMinutes}m)</td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">
                          {iv.rating ? `★ ${iv.rating}/5 • ` : ''}
                          {iv.feedback || 'Pending feedback'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge status={iv.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackInterview(iv);
                              feedbackForm.reset({
                                status: iv.status,
                                rating: iv.rating || 4,
                                feedback: iv.feedback || '',
                              });
                            }}
                            className="btn-secondary text-xs py-1 px-2.5"
                          >
                            Update Feedback
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Job Modal */}
      <Modal isOpen={jobModalOpen} onClose={() => setJobModalOpen(false)} title={editingJob ? 'Edit Job Opening' : 'Create Job Opening'} size="lg">
        <form onSubmit={jobForm.handleSubmit(onSaveJob)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Job Title *</label>
              <input className="input-field" {...jobForm.register('title', { required: true })} />
            </div>
            <div>
              <label className="label-text">Department *</label>
              <select className="input-field" {...jobForm.register('department', { required: true })}>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Experience Required *</label>
              <input className="input-field" {...jobForm.register('experience', { required: true })} />
            </div>
            <div>
              <label className="label-text">Employment Type</label>
              <select className="input-field" {...jobForm.register('employmentType')}>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="label-text">Location</label>
              <input className="input-field" {...jobForm.register('location')} />
            </div>
            <div>
              <label className="label-text">Application Deadline *</label>
              <input type="date" className="input-field" {...jobForm.register('applicationDeadline', { required: true })} />
            </div>
            <div>
              <label className="label-text">Required Skills (comma-separated)</label>
              <input className="input-field" placeholder="React, Node.js, MongoDB" {...jobForm.register('requiredSkills')} />
            </div>
            <div>
              <label className="label-text">Status</label>
              <select className="input-field" {...jobForm.register('status')}>
                <option value="Open">Open</option>
                <option value="On Hold">On Hold</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-text">Job Description *</label>
            <textarea rows={4} className="input-field" {...jobForm.register('description', { required: true })} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setJobModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={jobForm.formState.isSubmitting} className="btn-primary">Save Job</button>
          </div>
        </form>
      </Modal>

      {/* Candidate Modal */}
      <Modal isOpen={candModalOpen} onClose={() => setCandModalOpen(false)} title="Add Candidate" size="md">
        <form onSubmit={candForm.handleSubmit(onSaveCandidate)} className="space-y-4">
          <div>
            <label className="label-text">Job Opening *</label>
            <select className="input-field" {...candForm.register('job', { required: true })}>
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>{j.title} ({j.code})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">First Name *</label>
              <input className="input-field" {...candForm.register('firstName', { required: true })} />
            </div>
            <div>
              <label className="label-text">Last Name *</label>
              <input className="input-field" {...candForm.register('lastName', { required: true })} />
            </div>
            <div>
              <label className="label-text">Email *</label>
              <input type="email" className="input-field" {...candForm.register('email', { required: true })} />
            </div>
            <div>
              <label className="label-text">Phone *</label>
              <input className="input-field" {...candForm.register('phone', { required: true })} />
            </div>
            <div>
              <label className="label-text">Experience (Years)</label>
              <input type="number" step="0.5" className="input-field" {...candForm.register('experienceYears')} />
            </div>
            <div>
              <label className="label-text">Skills</label>
              <input className="input-field" placeholder="Node.js, SQL" {...candForm.register('skills')} />
            </div>
          </div>
          <div>
            <label className="label-text">Resume (PDF/DOC)</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} className="block w-full text-xs text-slate-600" />
          </div>
          <div>
            <label className="label-text">Notes</label>
            <textarea rows={2} className="input-field" {...candForm.register('notes')} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCandModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={candForm.formState.isSubmitting} className="btn-primary">Add Candidate</button>
          </div>
        </form>
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal isOpen={interviewModalOpen} onClose={() => setInterviewModalOpen(false)} title="Schedule Interview" size="md">
        <form onSubmit={interviewForm.handleSubmit(onScheduleInterview)} className="space-y-4">
          <div>
            <label className="label-text">Candidate *</label>
            <select className="input-field" {...interviewForm.register('candidate', { required: true })}>
              {candidates.map((c) => (
                <option key={c._id} value={c._id}>{c.firstName} {c.lastName} — {c.job?.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Date &amp; Time *</label>
              <input type="datetime-local" className="input-field" {...interviewForm.register('scheduledAt', { required: true })} />
            </div>
            <div>
              <label className="label-text">Duration (Minutes)</label>
              <input type="number" className="input-field" {...interviewForm.register('durationMinutes')} />
            </div>
            <div>
              <label className="label-text">Mode</label>
              <select className="input-field" {...interviewForm.register('mode')}>
                <option value="Video">Video</option>
                <option value="In-Person">In-Person</option>
                <option value="Phone">Phone</option>
              </select>
            </div>
            <div>
              <label className="label-text">Meeting Link / Room</label>
              <input className="input-field" {...interviewForm.register('locationOrLink')} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setInterviewModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={interviewForm.formState.isSubmitting} className="btn-primary">Schedule</button>
          </div>
        </form>
      </Modal>

      {/* Interview Feedback Modal */}
      <Modal isOpen={Boolean(feedbackInterview)} onClose={() => setFeedbackInterview(null)} title="Interview Feedback & Outcome" size="md">
        <form onSubmit={feedbackForm.handleSubmit(onSaveInterviewFeedback)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Status</label>
              <select className="input-field" {...feedbackForm.register('status')}>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No-Show">No-Show</option>
              </select>
            </div>
            <div>
              <label className="label-text">Rating (1-5)</label>
              <input type="number" min={1} max={5} className="input-field" {...feedbackForm.register('rating')} />
            </div>
          </div>
          <div>
            <label className="label-text">Feedback Notes</label>
            <textarea rows={4} className="input-field" {...feedbackForm.register('feedback')} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setFeedbackInterview(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={feedbackForm.formState.isSubmitting} className="btn-primary">Save Feedback</button>
          </div>
        </form>
      </Modal>

      {/* Convert Candidate to Employee Modal */}
      <Modal
        isOpen={Boolean(convertCandidate)}
        onClose={() => setConvertCandidate(null)}
        title={`Convert ${convertCandidate?.firstName || ''} ${convertCandidate?.lastName || ''} to Employee`}
        size="md"
      >
        <form onSubmit={convertForm.handleSubmit(onConvertCandidate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Employee ID *</label>
              <input className="input-field" {...convertForm.register('employeeId', { required: true })} />
            </div>
            <div>
              <label className="label-text">Joining Date *</label>
              <input type="date" className="input-field" {...convertForm.register('joiningDate', { required: true })} />
            </div>
            <div>
              <label className="label-text">Designation *</label>
              <input className="input-field" {...convertForm.register('designation', { required: true })} />
            </div>
            <div>
              <label className="label-text">Basic Salary</label>
              <input type="number" className="input-field" {...convertForm.register('basicSalary')} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setConvertCandidate(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={convertForm.formState.isSubmitting} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
              Confirm &amp; Onboard
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
