import jwt from "jsonwebtoken";

import { logger } from "./utils/errorLogger.js";

// jwt auth 
export const jwtAuth = async (req, res, next) => {
    // console.log("Inside jwt auth middleware in index.js");
    if (!req.user) {
        let token;
        // console.log(req.cookies);
        if (req.cookies) token = req.cookies['jwt'];
        else if (req.headers['authorization']) token = req.headers['authorization'].split(' ')[1];
        // console.log("token is:"+token);
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                delete decoded['iat'];
                delete decoded['exp'];
                await new Promise((resolve, reject) => {
                    req.login(decoded, (error) => {
                        if (error) {
                            console.log(error);
                            reject(error.message);
                        }
                        else {
                            console.log("User logged in using jwt.");
                            resolve();
                        }
                    });
                });
            }
            catch (error) {
                console.log("Error in jwt auth middleware. Error is:")
                console.log(error);
            }
        }
    }
    // console.log(req.session);
    next();
};

//Other auth middlewares -----------------

//As the req.session will always be available, we dont need to check for it (check notes for further explanation)

export const isAuthorizedForCompleteProfile = async (req, res, next) => {
    if (req.session['userCredentials'] && ((req.session['registerOTP'] && req.session.registerOTP['isVerified']) || req.session.userCredentials['authenticator'] == 'google')) {
        // console.log(req.session['userCredentials']);
        next();
    }
    else if (req.session['userCredentials'] && req.session['registerOTP'] && req.session.registerOTP['isVerified'] === false) {
        console.log("User email is not verified. Heading to email verification!");
        await logger(req, 'User email is not verified. Heading to email verification!');
        res.redirect('/auth/register/verifyEmail');
    }
    else {
        console.log("User is not authorized for this request in completeProfile endpoint!");
        await logger(req, 'User is not authorized to access the completeProfile page!');
        res.redirect('/auth/register');
    }
}

export const isAuthenticated = async (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    }
    else {
        console.log("User not authorized for this section in user route!");
        await logger(req, 'User is not authorized for this section! You may have logged out, please log in again...');
        // console.log("Session before:");
        // console.log(req.session);
        if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
            res.status(401).send('<html></html>');
        }
        else {
            res.redirect('/auth/login');
        }
    }
}

export const isAlreadyLoggedIn = async (req, res, next) => {
    if (req.isAuthenticated()) {
        console.log("User already logged in! Redirecting to dashboard...");
        await logger(req, 'User already logged in! Redirected to dashboard...');
        res.redirect('/user/dashboard');
    }
    else next();
}

export const isAuthorizedForRegisterOTP = async (req, res, next) => {
    if (req.session['userCredentials'] && req.session['registerOTP'] && req.session.registerOTP['isVerified'] === false)
        next();
    else if (req.session['userCredentials'] && req.session['registerOTP'] && req.session.registerOTP['isVerified'] === true) {
        console.log("User email has been verified. Redirecting to completeProfile page!");
        await logger(req, 'User email has been verified. Redirecting to completeProfile page!');
        res.redirect('/auth/register/completeProfile');
    }
    else {
        console.log("User not authorized to access this section in register (verifyEmail) endpoint!");
        await logger(req, 'User is not authorized for this section! Please go to \'register\' then come here!');
        res.redirect('/');
    }
}

export const isAuthorizedForForgotOTP = async (req, res, next) => {
    if (req.session['forgotUserCredentials'] && req.session['forgotOTP'] && req.session.forgotOTP['isVerified'] === false)
        next();
    else if (req.session['forgotUserCredentials'] && req.session['forgotOTP'] && req.session.forgotOTP['isVerified'] === true) {
        console.log("User email has been verified. Redirecting to change password page!");
        await logger(req, 'User email has been verified. Redirecting to change password page!');
        res.redirect('/auth/login/forgotPassword/newPassword');
    }
    else {
        console.log("User not authorized to access this section in login (verifyEmail for forgot password) endpoint!");
        await logger(req, 'User is not authorized for this section! Please go to \'login\' -> \'Forgot Password\' then come here!');
        res.redirect('/');
    }
}

export const isAuthorizedForForgotNewPassword = async (req, res, next) => {
    if (req.session['forgotUserCredentials'] && req.session['forgotOTP'] && req.session.forgotOTP['isVerified'] === true)
        next();
    else if (req.session['forgotUserCredentials'] && req.session['forgotOTP'] && req.session.forgotOTP['isVerified'] === false) {
        console.log("User email is not verified. Heading to email verification!");
        await logger(req, 'User email is not verified. Heading to email verification!');
        res.redirect('/auth/login/forgotPassword/otp');
    }
    else {
        console.log("User is not authorized to access forgot change password page!");
        await logger(req, 'User is not authorized to access forgot change password page!');
        res.redirect('/auth/login');
    }
}