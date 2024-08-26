import express from "express";

import { registerUser, assignJWT, verifyEmail, forgotVerifyEmail } from "../controllers/authController.js";
import { validateUsername, validatePassword, validateNewPassword, validateName, validateRollNo, validateCollegeName, validateCurrSem, checkUsernameAlreadyExists, validateRegisterOTP, checkUsernameRegistered, validateForgotOTP } from "../validators/authValidator.js";
import { validateChangeRepeatNewPassword, validateChangeNewPassword } from "../validators/userValidator.js";
import { registerOTPLimiterPerTry, registerOTPLimiterPerDay, registerOTPLimiterPerDayPerIP, forgotOTPLimiterPerTry, forgotOTPLimiterPerDay, forgotOTPLimiterPerDayPerIP } from "../utils/rateLimiter.js";
import { allRegister, getLogin, postLoginLocal, postLoginJWT, getRegister, postRegisterLocal, getGoogle, getGoogleCallback, postRegisterJWT, getRegisterCompleteProfile, postRegisterCompleteProfile1, postRegisterCompleteProfile2, getRegisterCompleteProfileChangeUsername, getRegisterVerifyEmail, postRegisterVerifyEmail, getRegisterVerifyEmailCancel, getRegisterVerifyEmailResendOTP, getLoginForgotPasswordUsername, postLoginForgotPasswordUsername, getLoginForgotPasswordOTP, postLoginForgotPasswordOTP, getLoginForgotPasswordOTPCancel, getLoginForgotPasswordOTPResendOTP, getLoginForgotPasswordNewPassword, postLoginForgotPasswordNewPassword, getLoginForgotPasswordNewPasswordCancel, postLogout } from "../controllers/authController.js";

const router = express.Router();

//sort of middleware but it matches the exact URL, that's why I used it
//instead of app.use() as I want only the /auth/register route for this...
router.all('/register', allRegister);

router.get('/login', getLogin);

router.post('/login/local', [validateUsername, validatePassword], postLoginLocal);

router.post('/login/jwt', [validateUsername, validatePassword], postLoginJWT)

router.get('/register', getRegister);

router.post('/register/local', [validateUsername, checkUsernameAlreadyExists], postRegisterLocal, [registerOTPLimiterPerTry, registerOTPLimiterPerDay, registerOTPLimiterPerDayPerIP], verifyEmail);

router.get('/google', getGoogle);

router.get('/google/callback', getGoogleCallback);

router.post('/register/jwt', [validateUsername, checkUsernameAlreadyExists], postRegisterJWT, [registerOTPLimiterPerTry, registerOTPLimiterPerDay, registerOTPLimiterPerDayPerIP], verifyEmail);

// Using a middleware(isAuthorizedForCompleteProfile()) to handle validity of 
// req(in '/auth/register/completeProfile' route for all methods), so if a 
// req comes to this middleware it means that it is valid
router.get('/register/completeProfile', getRegisterCompleteProfile);

router.post('/register/completeProfile', [validateNewPassword, validateName, validateRollNo, validateCollegeName, validateCurrSem], postRegisterCompleteProfile1, registerUser, assignJWT, postRegisterCompleteProfile2);

router.get('/register/completeProfile/changeUsername', getRegisterCompleteProfileChangeUsername);

router.get('/register/verifyEmail', getRegisterVerifyEmail);

router.post('/register/verifyEmail', [validateRegisterOTP], postRegisterVerifyEmail);

router.get('/register/verifyEmail/cancel', getRegisterVerifyEmailCancel);

router.get('/register/verifyEmail/resendOTP', [registerOTPLimiterPerTry, registerOTPLimiterPerDay, registerOTPLimiterPerDayPerIP], getRegisterVerifyEmailResendOTP);

router.get('/login/forgotPassword/username', getLoginForgotPasswordUsername);

router.post('/login/forgotPassword/username', [validateUsername, checkUsernameRegistered], postLoginForgotPasswordUsername, [forgotOTPLimiterPerTry, forgotOTPLimiterPerDay, forgotOTPLimiterPerDayPerIP], forgotVerifyEmail);

router.get('/login/forgotPassword/otp', getLoginForgotPasswordOTP);

router.post('/login/forgotPassword/otp', [validateForgotOTP], postLoginForgotPasswordOTP);

router.get('/login/forgotPassword/otp/cancel', getLoginForgotPasswordOTPCancel);

router.get('/login/forgotPassword/otp/resendOTP', [forgotOTPLimiterPerTry, forgotOTPLimiterPerDay, forgotOTPLimiterPerDayPerIP], getLoginForgotPasswordOTPResendOTP);

router.get('/login/forgotPassword/newPassword', getLoginForgotPasswordNewPassword);

router.post('/login/forgotPassword/newPassword', [validateChangeRepeatNewPassword, validateChangeNewPassword], postLoginForgotPasswordNewPassword);

router.get('/login/forgotPassword/newPassword/cancel', getLoginForgotPasswordNewPasswordCancel);

router.post('/logout', postLogout);


export default router;