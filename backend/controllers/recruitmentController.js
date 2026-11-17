const path = require('path');
const fs = require('fs');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { runWithTransaction } = require('../utils/transaction');
const { ensureLeaveBalance } = require('../services/leaveBalanceService');
const { notifyUsers, notifyHRAndAdmins } = require('../services/notificationService');
const { recordAudit } = require('../services/auditService');
const { UPLOAD_ROOT } = require('../middleware/upload');

function normalizeSkills(skills) {
  if (Array.isArray(skills)) return skills.map((s) => String(s).trim()).filter(Boolean);
  if (typeof skills === 'string') {
    return skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// --- JOBS ---
const getJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query, '-createdAt');
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.search) {
    const regex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: regex }, { code: regex }, { location: regex }];
  }

  const [jobs, total, candidateCounts] = await Promise.all([
    Job.find(filter)
      .populate('department', 'name code')
      .populate('postedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(filter),
    Candidate.aggregate([{ $group: { _id: '$job', count: { $sum: 1 } } }]),
  ]);

  const countMap = new Map(candidateCounts.map((c) => [String(c._id), c.count]));
  const enriched = jobs.map((j) => ({ ...j, candidateCount: countMap.get(String(j._id)) || 0 }));

  return sendResponse(res, {
    statusCode: 200,
    message: 'Job openings retrieved',
    data: enriched,
    meta: buildMeta(total, page, limit),
  });
});

const createJob = asyncHandler(async (req, res) => {
  const data = req.body;
  const dept = await Department.findById(data.department);
  if (!dept) throw new ApiError(400, 'Selected department does not exist.');

  const job = await Job.create({
    ...data,
    requiredSkills: normalizeSkills(data.requiredSkills),
    applicationDeadline: new Date(data.applicationDeadline),
    postedBy: req.user._id,
  });

  await recordAudit({
    req,
    action: 'JOB_CREATED',
    entityType: 'Job',
    entityId: job._id,
    metadata: { title: job.title, department: dept.name },
  });

  const populated = await Job.findById(job._id).populate('department', 'name code');
  return sendResponse(res, {
    statusCode: 201,
    message: 'Job opening created successfully',
    data: populated,
  });
});

const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new ApiError(404, 'Job opening not found.');

  const data = req.body;
  const fields = [
    'title',
    'department',
    'description',
    'experience',
    'employmentType',
    'location',
    'openingsCount',
    'applicationDeadline',
    'status',
  ];
  fields.forEach((f) => {
    if (data[f] !== undefined) {
      job[f] = f === 'applicationDeadline' ? new Date(data[f]) : data[f];
    }
  });
  if (data.requiredSkills !== undefined) {
    job.requiredSkills = normalizeSkills(data.requiredSkills);
  }

  await job.save();

  await recordAudit({
    req,
    action: 'JOB_UPDATED',
    entityType: 'Job',
    entityId: job._id,
    metadata: { title: job.title, status: job.status },
  });

  const populated = await Job.findById(job._id).populate('department', 'name code');
  return sendResponse(res, {
    statusCode: 200,
    message: 'Job opening updated successfully',
    data: populated,
  });
});

// --- CANDIDATES ---
const getCandidates = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query, '-createdAt');
  const filter = {};
  if (req.query.job) filter.job = req.query.job;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const regex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }];
  }

  const [candidates, total] = await Promise.all([
    Candidate.find(filter)
      .populate({
        path: 'job',
        select: 'title code department employmentType',
        populate: { path: 'department', select: 'name code' },
      })
      .populate('convertedEmployee', 'employeeId firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Candidate.countDocuments(filter),
  ]);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Candidates retrieved',
    data: candidates,
    meta: buildMeta(total, page, limit),
  });
});

const createCandidate = asyncHandler(async (req, res) => {
  const data = req.body;
  const job = await Job.findById(data.job);
  if (!job) throw new ApiError(404, 'Selected job opening not found.');

  const resume = req.file
    ? {
        fileName: req.file.originalname,
        filePath: `resumes/${req.file.filename}`,
        mimeType: req.file.mimetype,
      }
    : undefined;

  const candidate = await Candidate.create({
    job: data.job,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email.toLowerCase(),
    phone: data.phone,
    experienceYears: Number(data.experienceYears) || 0,
    skills: normalizeSkills(data.skills),
    status: data.status || 'Applied',
    notes: data.notes || '',
    ...(resume ? { resume } : {}),
  });

  await recordAudit({
    req,
    action: 'CANDIDATE_CREATED',
    entityType: 'Candidate',
    entityId: candidate._id,
    metadata: { email: candidate.email, jobTitle: job.title },
  });

  const populated = await Candidate.findById(candidate._id).populate({
    path: 'job',
    select: 'title code department',
    populate: { path: 'department', select: 'name code' },
  });

  return sendResponse(res, {
    statusCode: 201,
    message: 'Candidate record created successfully',
    data: populated,
  });
});

const updateCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) throw new ApiError(404, 'Candidate not found.');

  const data = req.body;
  ['firstName', 'lastName', 'email', 'phone', 'experienceYears', 'status', 'notes', 'job'].forEach((f) => {
    if (data[f] !== undefined) {
      candidate[f] = f === 'email' ? String(data[f]).toLowerCase() : data[f];
    }
  });
  if (data.skills !== undefined) candidate.skills = normalizeSkills(data.skills);
  if (req.file) {
    candidate.resume = {
      fileName: req.file.originalname,
      filePath: `resumes/${req.file.filename}`,
      mimeType: req.file.mimetype,
    };
  }

  await candidate.save();

  await recordAudit({
    req,
    action: 'CANDIDATE_UPDATED',
    entityType: 'Candidate',
    entityId: candidate._id,
    metadata: { status: candidate.status },
  });

  const populated = await Candidate.findById(candidate._id).populate({
    path: 'job',
    select: 'title code department',
    populate: { path: 'department', select: 'name code' },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Candidate updated successfully',
    data: populated,
  });
});

const downloadResume = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate || !candidate.resume?.filePath) {
    throw new ApiError(404, 'Resume not found.');
  }

  const absPath = path.resolve(UPLOAD_ROOT, candidate.resume.filePath);
  if (!absPath.startsWith(path.resolve(UPLOAD_ROOT)) || !fs.existsSync(absPath)) {
    throw new ApiError(404, 'Resume file not found on disk.');
  }

  return res.download(absPath, candidate.resume.fileName || 'resume.pdf');
});

const convertCandidateToEmployee = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id).populate('job');
  if (!candidate) throw new ApiError(404, 'Candidate not found.');
  if (candidate.convertedEmployee) {
    throw new ApiError(409, 'Candidate has already been converted to an employee.');
  }
  if (!['Selected', 'Hired'].includes(candidate.status)) {
    throw new ApiError(400, 'Candidate must be Selected or Hired before converting to an employee.');
  }

  const employeeId = (req.body.employeeId || `EMP-${Date.now().toString().slice(-5)}`).toUpperCase();
  const designation = req.body.designation || candidate.job?.title || 'Associate';
  const department = req.body.department || candidate.job?.department;
  const joiningDate = req.body.joiningDate ? new Date(req.body.joiningDate) : new Date();
  const basicSalary = Number(req.body.basicSalary) || 50000;

  const existingEmp = await Employee.findOne({
    $or: [{ email: candidate.email }, { employeeId }],
  });
  if (existingEmp) {
    throw new ApiError(409, 'An employee with this email or Employee ID already exists.');
  }

  const result = await runWithTransaction(async (session) => {
    const empDoc = {
      employeeId,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      department,
      designation,
      joiningDate,
      employmentType: candidate.job?.employmentType || 'Full-Time',
      salary: {
        basic: basicSalary,
        hra: Number(req.body.hra) || 0,
        otherAllowances: Number(req.body.otherAllowances) || 0,
        deductions: Number(req.body.deductions) || 0,
        currency: 'INR',
      },
      employmentStatus: 'Active',
    };

    const [employee] = session ? await Employee.create([empDoc], { session }) : [await Employee.create(empDoc)];
    await ensureLeaveBalance(employee._id, new Date().getUTCFullYear(), session);

    candidate.status = 'Hired';
    candidate.convertedEmployee = employee._id;
    await candidate.save(session ? { session } : {});

    return employee;
  });

  await recordAudit({
    req,
    action: 'CANDIDATE_CONVERTED_TO_EMPLOYEE',
    entityType: 'Employee',
    entityId: result._id,
    metadata: { candidateId: String(candidate._id), employeeId: result.employeeId },
  });

  await notifyHRAndAdmins({
    type: 'EMPLOYEE_ADDED',
    title: 'Hired Candidate Onboarded',
    message: `${result.firstName} ${result.lastName} was converted from candidate to employee (${result.employeeId}).`,
    link: `/employees/${result._id}`,
  });

  return sendResponse(res, {
    statusCode: 201,
    message: 'Candidate converted to employee successfully',
    data: result,
  });
});

// --- INTERVIEWS ---
const getInterviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, '-scheduledAt');
  const filter = {};
  if (req.query.candidate) filter.candidate = req.query.candidate;
  if (req.query.status) filter.status = req.query.status;

  const [interviews, total] = await Promise.all([
    Interview.find(filter)
      .populate('candidate', 'firstName lastName email status')
      .populate('job', 'title code')
      .populate('interviewers', 'name email role')
      .sort({ scheduledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Interview.countDocuments(filter),
  ]);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Interviews retrieved',
    data: interviews,
    meta: buildMeta(total, page, limit),
  });
});

const scheduleInterview = asyncHandler(async (req, res) => {
  const data = req.body;
  const candidate = await Candidate.findById(data.candidate).populate('job');
  if (!candidate) throw new ApiError(404, 'Candidate not found.');

  const interview = await Interview.create({
    candidate: candidate._id,
    job: data.job || candidate.job._id,
    interviewers: data.interviewers || [req.user._id],
    scheduledAt: new Date(data.scheduledAt),
    durationMinutes: data.durationMinutes || 60,
    mode: data.mode || 'Video',
    locationOrLink: data.locationOrLink || '',
    feedback: data.feedback || '',
    rating: data.rating ?? null,
    status: data.status || 'Scheduled',
    scheduledBy: req.user._id,
  });

  if (['Applied', 'Shortlisted'].includes(candidate.status)) {
    candidate.status = 'Interview Scheduled';
    await candidate.save();
  }

  if (interview.interviewers.length > 0) {
    await notifyUsers(interview.interviewers, {
      type: 'INTERVIEW_SCHEDULED',
      title: 'Interview Scheduled',
      message: `Interview with ${candidate.firstName} ${candidate.lastName} for ${candidate.job?.title || 'Role'} on ${new Date(interview.scheduledAt).toUTCString()}.`,
      link: '/recruitment',
    });
  }

  await recordAudit({
    req,
    action: 'INTERVIEW_SCHEDULED',
    entityType: 'Interview',
    entityId: interview._id,
    metadata: { candidate: `${candidate.firstName} ${candidate.lastName}`, scheduledAt: interview.scheduledAt },
  });

  const populated = await Interview.findById(interview._id)
    .populate('candidate', 'firstName lastName email status')
    .populate('job', 'title code')
    .populate('interviewers', 'name email role');

  return sendResponse(res, {
    statusCode: 201,
    message: 'Interview scheduled successfully',
    data: populated,
  });
});

const updateInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) throw new ApiError(404, 'Interview not found.');

  ['scheduledAt', 'durationMinutes', 'mode', 'locationOrLink', 'feedback', 'rating', 'status', 'interviewers'].forEach(
    (f) => {
      if (req.body[f] !== undefined) {
        interview[f] = f === 'scheduledAt' ? new Date(req.body[f]) : req.body[f];
      }
    }
  );
  await interview.save();

  const populated = await Interview.findById(interview._id)
    .populate('candidate', 'firstName lastName email status')
    .populate('job', 'title code')
    .populate('interviewers', 'name email role');

  return sendResponse(res, {
    statusCode: 200,
    message: 'Interview updated successfully',
    data: populated,
  });
});

module.exports = {
  getJobs,
  createJob,
  updateJob,
  getCandidates,
  createCandidate,
  updateCandidate,
  downloadResume,
  convertCandidateToEmployee,
  getInterviews,
  scheduleInterview,
  updateInterview,
};
