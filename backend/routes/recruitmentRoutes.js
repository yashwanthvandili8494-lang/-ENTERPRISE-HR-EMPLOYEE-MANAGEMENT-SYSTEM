const express = require('express');
const recruitmentController = require('../controllers/recruitmentController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createJobSchema,
  updateJobSchema,
  createCandidateSchema,
  updateCandidateSchema,
  createInterviewSchema,
  updateInterviewSchema,
} = require('../validators/payrollRecruitmentValidator');
const { uploadResume } = require('../middleware/upload');
const { ROLES } = require('../utils/constants');

const jobRouter = express.Router();
jobRouter.use(protect);
jobRouter.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER), recruitmentController.getJobs);
jobRouter.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), validate(createJobSchema), recruitmentController.createJob);
jobRouter.put('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), validate(updateJobSchema), recruitmentController.updateJob);

const candidateRouter = express.Router();
candidateRouter.use(protect);
candidateRouter.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER), recruitmentController.getCandidates);
candidateRouter.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER),
  uploadResume.single('resume'),
  validate(createCandidateSchema),
  recruitmentController.createCandidate
);
candidateRouter.put(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER),
  uploadResume.single('resume'),
  validate(updateCandidateSchema),
  recruitmentController.updateCandidate
);
candidateRouter.get('/:id/resume', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER), recruitmentController.downloadResume);
candidateRouter.post('/:id/convert', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), recruitmentController.convertCandidateToEmployee);

const interviewRouter = express.Router();
interviewRouter.use(protect);
interviewRouter.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER), recruitmentController.getInterviews);
interviewRouter.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), validate(createInterviewSchema), recruitmentController.scheduleInterview);
interviewRouter.put('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER), validate(updateInterviewSchema), recruitmentController.updateInterview);

module.exports = { jobRouter, candidateRouter, interviewRouter };
