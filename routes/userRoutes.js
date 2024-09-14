import express from "express";
const router = express.Router();

import { validateNewSem, validateCourseName, validateCID, checkCIDAlreadyExists, validateProfessor, validateDept, validateCredits, validateSem, validatePrevCID, validateCourseDate, validateStatus, validatePrevStatus, validateAID, validateQuiz1, validateQuiz2, validateMidSem, validateEndSem, validateInternal, validateEventName, validateEventType, validateDescription, validateIssueDate, validateDeadline, validateCompletionDate, validateEventCID, validateEID, validateCurrPassword, validateChangeNewPassword, validateChangeRepeatNewPassword } from "../validators/userValidator.js";
import { validateName, validateRollNo, validateCollegeName, validateCurrSem } from "../validators/authValidator.js";
import { get_dashboard, post_updateSessionSem, get_courses, post_courses, put_courses, delete_courses, get_attendance, post_attendance, post_attendanceAdd, put_attendance, delete_attendance, get_marks, put_marks, get_events, post_eventsGetCID, post_events, post_eventsGetEvent, put_events, delete_events, get_profile, post_changePassword, post_changeUserDetails } from "../controllers/userController.js";

router.get('/dashboard', get_dashboard);

router.post('/updateSessionSem', [validateNewSem], post_updateSessionSem);

router.get('/courses', get_courses);

router.post('/courses', [validateCourseName, validateCID, checkCIDAlreadyExists, validateProfessor, validateDept, validateCredits, validateSem], post_courses)

router.put('/courses', [validateCourseName, validateCID, validateProfessor, validateDept, validateCredits, validateSem, validatePrevCID], put_courses);

router.delete('/courses', [validateCID], delete_courses);

router.get('/attendance', get_attendance);

router.post('/attendance', [validateCID], post_attendance);

router.post('/attendance/add', [validateCID, validateCourseDate, validateStatus], post_attendanceAdd);

router.put('/attendance', [validateAID, validateCID, validateCourseDate, validateStatus, validatePrevStatus], put_attendance);

router.delete('/attendance', [validateAID, validateCID, validatePrevStatus], delete_attendance);

router.get('/marks', get_marks);

router.put('/marks', [validateCID, validateQuiz1, validateMidSem, validateQuiz2, validateEndSem, validateInternal], put_marks);

router.get('/events', get_events);

router.post('/events/getCID', [validateSem], post_eventsGetCID);

router.post('/events', [validateEventName, validateEventType, validateSem, validateDescription, validateIssueDate, validateDeadline, validateCompletionDate, validateEventCID], post_events);


router.post('/events/getEvent', [validateEID], post_eventsGetEvent);

router.put('/events', [validateEID, validateEventName, validateEventType, validateSem, validateDescription, validateIssueDate, validateDeadline, validateCompletionDate, validateEventCID], put_events);

router.delete('/events', [validateEID], delete_events);

router.get('/profile', get_profile);

router.post('/changePassword', [validateCurrPassword, validateChangeRepeatNewPassword, validateChangeNewPassword], post_changePassword);

router.post('/changeUserDetails', [validateName, validateRollNo, validateCollegeName, validateCurrSem], post_changeUserDetails);

export default router;
