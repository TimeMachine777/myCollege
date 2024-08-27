import pool from "../config/db.js";
import { body } from 'express-validator';

export const validateUsername =
    body('username')
        .trim()
        .notEmpty().withMessage('username cannot be empty')
        .isLength({ max: 100 }).withMessage('username(email) must be less than 100 characters long')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail();

export const validatePassword =
    body('password')
        .trim()
        .isLength({ min: 8, max: 20 }).withMessage('Password must be 8-20 characters long');

export const validateNewPassword =
    body('password')
        .trim()
        .isLength({ min: 8, max: 20 }).withMessage('Password must be 8-20 characters long')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/\d/).withMessage('Password must contain at least one number')
        .matches(/[\W_]/).withMessage('Password must contain at least one special character')
        .matches(/^[A-Za-z0-9!@#$%^&*()_]+$/).withMessage('Password contains invalid characters( only allowed: a-z,A-Z,0-9,!@#$%^&*()_ )');

export const checkUsernameAlreadyExists =
    body('username').bail()
        .custom(async (username) => {
            const results = await pool.query('select * from users where username=$1', [username]);
            if (results.rows.length > 0)
                throw new Error('Email already in use!');
            return true;
        });

export const validateName =
    body('name')
        .trim()
        .notEmpty().withMessage('Name cannot be empty')
        .isLength({ max: 100 }).withMessage('Name max length should be 100 char.')
        .matches(/^[a-zA-Z0-9 \.]+$/).withMessage('Invalid name format(only allowed char: a-z,A-Z,0-9,.)');

export const validateRollNo =
    body('roll_no')
        .trim()
        .notEmpty().withMessage('Roll No cannot be empty')
        .isLength({ max: 20 }).withMessage('Roll No max length should be 20 char.')
        .matches(/^[a-zA-Z0-9\/]+$/).withMessage('Roll number contains invalid characters(only allowed: a-z,A-Z,0-9,\\)');

export const validateCollegeName =
    body('college')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('College name max length should be 50 char.')
        .matches(/^[a-zA-Z0-9\/, \.]*$/).withMessage('College name contains invalid characters(only allowed: a-z,A-Z,0-9,\,. & ,)');

export const validateCurrSem =
    body('current_sem')
        .trim()
        .notEmpty().withMessage('Semester value cannot be empty')
        .isNumeric().withMessage('Semester must be a number')
        .isInt({ min: 1 }).withMessage('Semester must be greater than 0')
        .toInt(); // Optionally, convert the value to an integer

export const validateRegisterOTP =
    body('otp')
        .trim()
        .isNumeric().withMessage('OTP must be a number')
        .isLength({ min: 4, max: 4 }).withMessage('OTP should be 4 character long.')
        .custom((otp, { req }) => {
            const actualOTP = req.session.registerOTP['valueOTP'];
            if (otp !== actualOTP) {
                throw new Error('Incorrect OTP!');
            }
            return true;
        });

export const checkUsernameRegistered =
    body('username').bail()
        .custom(async (username) => {
            const results = await pool.query('select * from users where username=$1', [username]);
            if (results.rows.length === 0)
                throw new Error('Email not registered!');
            return true;
        });

export const validateForgotOTP =
    body('otp')
        .trim()
        .isNumeric().withMessage('OTP must be a number')
        .isLength({ min: 4, max: 4 }).withMessage('OTP should be 4 character long.')
        .custom((otp, { req }) => {
            const actualOTP = req.session.forgotOTP['valueOTP'];
            if (otp !== actualOTP) {
                throw new Error('Incorrect OTP!');
            }
            return true;
        });