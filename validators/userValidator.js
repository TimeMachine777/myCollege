import pool from "../config/db.js";
import { body } from 'express-validator';

// setting max input date time
const now = () => new Date();
const endOfDay = () => new Date(now().getFullYear(), now().getMonth(), now().getDate(), 23, 59, 59);

export const validateNewSem =
    body('newSem')
        .trim()
        .notEmpty().withMessage('New semester value cannot be empty')
        .isNumeric().withMessage('Semester must be a number')
        .isInt({ min: 1 }).withMessage('Semester must be greater than 0')
        .toInt(); // Optionally, convert the value to an integer

export const validateCourseName =
    body('course_name')
        .trim()
        .notEmpty().withMessage('Course name cannot be empty')
        .isLength({ max: 50 }).withMessage('Course name max length should be 50 char.')
        .matches(/^[a-zA-Z0-9 \.]+$/).withMessage('Invalid course name format(only allowed char: a-z,A-Z,0-9,.)');

export const validateCID =
    body('cid')
        .trim()
        .notEmpty().withMessage('Course code value cannot be empty')
        .isLength({ max: 10 })
        .matches(/^[a-zA-Z]+[a-zA-Z0-9_-]*$/).withMessage('Invalid course code format(only allowed char: a-z,A-Z,0-9,_,-)\nCourse code must begin with a letter.');

export const checkCIDAlreadyExists =
    body('cid')
        .custom(async (value) => {
            try {
                const results = await pool.query('select * from academics where cid=$1', [value]);
                if (results.rows.length > 0) {
                    throw new Error('This course code already exists!');
                }
            }
            catch (error) {
                if (error.message.match(/exists!$/)) {
                    throw error;
                }
                console.log(error);
                throw new Error('Internal server error while fetching data from DB in CID validator.');
            }
        });

export const validateProfessor =
    body('professor')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Professor name max length should be 100 char.')
        .matches(/^[a-zA-Z0-9 \.]*$/).withMessage('Invalid professor name format(only allowed char: a-z,A-Z,0-9,.)');

export const validateDept =
    body('dept')
        .optional()
        .trim()
        .isLength({ max: 20 }).withMessage('Dept name max length should be 20 char.')
        .matches(/^[a-zA-Z \.]*$/).withMessage('Invalid dept name format(only allowed char: a-z,A-Z,.)');

export const validateCredits =
    body('credits')
        .trim()
        .isFloat({ min: 0, max: 100 }).withMessage('Credits must be a number with up to 1 decimal place, between 0 and 100, and in steps of 0.5')
        .custom(value => {
            // Additional custom validation to ensure the step size of 0.5
            const isValidStep = (value * 10) % 5 === 0;
            if (!isValidStep) {
                throw new Error('Credits must be in steps of 0.5');
            }
            return true;
        });

export const validateSem =
    body('sem')
        .trim()
        .notEmpty().withMessage('Semester value cannot be empty')
        .isNumeric().withMessage('Semester must be a number')
        .isInt({ min: 1 }).withMessage('Semester must be greater than 0')
        .toInt(); // Optionally, convert the value to an integer

export const validatePrevCID =
    body('prev_cid')
        .trim()
        .notEmpty().withMessage('Course code value cannot be empty')
        .isLength({ max: 10 })
        .matches(/^[a-zA-Z]+[a-zA-Z0-9_-]*$/).withMessage('Invalid course code format(only allowed char: a-z,A-Z,0-9,_,-)\nCourse code must begin with a letter.');

export const validateCourseDate =
    body('course_date')
        .trim()
        .notEmpty().withMessage('Date value value cannot be empty')
        .isISO8601().withMessage('Invalid date format, must be ISO 8601 format').bail()
        .custom(value => {
            const inputDate = new Date(value);
            if (inputDate > endOfDay()) {
                throw new Error(`Date must be on or before ${endOfDay().toLocaleString()}`);
            }
            return true;
        });

export const validateStatus =
    body('status')
        .trim()
        .notEmpty().withMessage('Status cannot be empty')
        .isIn(['P', 'A']).withMessage('Invalid status, must be either "P" (Present) or "A" (Absent)');

export const validatePrevStatus =
    body('prev_status')
        .trim()
        .notEmpty().withMessage('Status cannot be empty')
        .isIn(['P', 'A']).withMessage('Invalid status, must be either "P" (Present) or "A" (Absent)');

export const validateAID =
    body('aid')
        .trim()
        .notEmpty().withMessage('AID value cannot be empty')
        .isNumeric().withMessage('AID must be a number')
        .isInt({ min: 1 }).withMessage('AID must be greater than 0')
        .toInt(); // Optionally, convert the value to an integer

export const validateQuiz1 =
    body('quiz1')
        .optional({ values: 'falsy' })
        .trim()
        .isFloat({ min: 0, max: 10 }).withMessage('Quiz1 marks must be a number with up to 1 decimal place, between 0 and 10, and in steps of 0.5')
        .custom(value => {
            // Additional custom validation to ensure the step size of 0.5
            const isValidStep = (value * 10) % 5 === 0;
            if (!isValidStep) {
                throw new Error('Quiz1 marks must be in steps of 0.5');
            }
            return true;
        });
export const validateMidSem =
    body('mid_sem')
        .optional({ values: 'falsy' })
        .trim()
        .isFloat({ min: 0, max: 25 }).withMessage('Mid sem marks must be a number with up to 1 decimal place, between 0 and 25, and in steps of 0.5')
        .custom(value => {
            // Additional custom validation to ensure the step size of 0.5
            const isValidStep = (value * 10) % 5 === 0;
            if (!isValidStep) {
                throw new Error('Mid sem marks must be in steps of 0.5');
            }
            return true;
        });
export const validateQuiz2 =
    body('quiz2')
        .optional({ values: 'falsy' })
        .trim()
        .isFloat({ min: 0, max: 10 }).withMessage('Quiz2 marks must be a number with up to 1 decimal place, between 0 and 10, and in steps of 0.5')
        .custom(value => {
            // Additional custom validation to ensure the step size of 0.5
            const isValidStep = (value * 10) % 5 === 0;
            if (!isValidStep) {
                throw new Error('Quiz2 marks must be in steps of 0.5');
            }
            return true;
        });
export const validateEndSem =
    body('end_sem')
        .optional({ values: 'falsy' })
        .trim()
        .isFloat({ min: 0, max: 50 }).withMessage('End sem marks must be a number with up to 1 decimal place, between 0 and 50, and in steps of 0.5')
        .custom(value => {
            // Additional custom validation to ensure the step size of 0.5
            const isValidStep = (value * 10) % 5 === 0;
            if (!isValidStep) {
                throw new Error('End sem marks must be in steps of 0.5');
            }
            return true;
        });
export const validateInternal =
    body('internal')
        .optional({ values: 'falsy' })
        .trim()
        .isFloat({ min: 0, max: 5 }).withMessage('Internal marks must be a number with up to 1 decimal place, between 0 and 5, and in steps of 0.5')
        .custom(value => {
            // Additional custom validation to ensure the step size of 0.5
            const isValidStep = (value * 10) % 5 === 0;
            if (!isValidStep) {
                throw new Error('Internal marks must be in steps of 0.5');
            }
            return true;
        });

export const validateEventName =
    body('event_name')
        .trim()
        .notEmpty().withMessage('Event name cannot be empty')
        .isLength({ max: 200 }).withMessage('Event name max length should be 200 char.')
        .matches(/^[a-zA-Z0-9 \.]+$/).withMessage('Invalid event name format(only allowed char: a-z,A-Z,0-9,.)');

export const validateEventType =
    body('type')
        .trim()
        .notEmpty().withMessage('Event type cannot be empty')
        .isIn(['other', 'exam', 'assignment']).withMessage('Invalid type, must be in [other, exam, assignment]');

export const validateDescription =
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1500 }).withMessage('Description max length should be 1500 char.')
        .matches(/^[a-zA-Z0-9 \.\(\)\,!-]*$/).withMessage('Invalid description format(only allowed char: a-z,A-Z,0-9,.,,,!)');

export const validateIssueDate =
    body('issue_date')
        .trim()
        .notEmpty().withMessage('Issue date cannot be empty')
        .isISO8601().withMessage('Invalid issue date format, must be ISO 8601 format');

export const validateDeadline =
    body('deadline')
        .trim()
        .notEmpty().withMessage('deadline date cannot be empty')
        .isISO8601().withMessage('Invalid deadline format, must be ISO 8601 format').bail()
        .custom((deadline, { req }) => {
            const deadlineDate = new Date(deadline);
            const issueDate = new Date(req.body['issue_date']);
            if (deadlineDate <= issueDate) {
                throw new Error('Deadline must be strictly greater than the issue_date');
            }
            return true;
        });

export const validateCompletionDate =
    body('completion_date')
        .optional({ values: 'falsy' })
        .trim()
        .isISO8601().withMessage('Invalid completion date format, must be ISO 8601 format').bail()
        .custom((completion_date, { req }) => {
            const completionDate = new Date(completion_date);
            const issueDate = new Date(req.body['issue_date']);
            if (completionDate <= issueDate) {
                throw new Error('completion date must be strictly greater than the issue_date');
            }
            return true;
        });

export const validateEventCID =
    body('cid')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 10 })
        .matches(/^[a-zA-Z]+[a-zA-Z0-9_-]*$/).withMessage('Invalid course code format(only allowed char: a-z,A-Z,0-9,_,-)\nCourse code must begin with a letter.');

export const validateEID =
    body('eid')
        .trim()
        .notEmpty().withMessage('EID value cannot be empty')
        .isNumeric().withMessage('EID must be a number')
        .isInt({ min: 1 }).withMessage('EID must be greater than 0')
        .toInt(); // Optionally, convert the value to an integer

export const validateCurrPassword =
    body('curr_password')
        .trim()
        .isLength({ min: 8, max: 20 }).withMessage('Current password must be 8-20 characters long');

export const validateChangeRepeatNewPassword =
    body('repeat_new_password')
        .trim()
        .notEmpty()
        .custom((val, { req }) => {
            if (val !== req.body['new_password']) {
                throw new Error('New password must match the repeat new password!');
            }
            return true;
        });

export const validateChangeNewPassword =
    body('new_password')
        .trim()
        .isLength({ min: 8, max: 20 }).withMessage('Password must be 8-20 characters long')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/\d/).withMessage('Password must contain at least one number')
        .matches(/[\W_]/).withMessage('Password must contain at least one special character')
        .matches(/^[A-Za-z0-9!@#$%^&*()_]+$/).withMessage('Password contains invalid characters( only allowed: a-z,A-Z,0-9,!@#$%^&*()_ )');
