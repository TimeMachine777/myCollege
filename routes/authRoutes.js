import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";

import { logger } from "../utils/errorLogger.js";
import { registerUser, assignJWT, verifyEmail, generateJWTToken, generateOTP, forgotVerifyEmail, forgotChangePassword } from "../controllers/authController.js";
import { validateUsername, validatePassword, validateNewPassword, validateName, validateRollNo, validateCollegeName, validateCurrSem, checkUsernameAlreadyExists, validateRegisterOTP, checkUsernameRegistered, validateForgotOTP } from "../validators/authValidator.js";
import { validateChangeRepeatNewPassword, validateChangeNewPassword } from "../validators/userValidator.js";
import { registerOTPLimiterPerTry, registerOTPLimiterPerDay, registerOTPLimiterPerDayPerIP, forgotOTPLimiterPerTry, forgotOTPLimiterPerDay, forgotOTPLimiterPerDayPerIP } from "../utils/rateLimiter.js";
import { sendEmail } from "../utils/EmailService.js";

const router = express.Router();

//sort of middleware but it matches the exact URL, that's why I used it
//instead of app.use() as I want only the /auth/register route for this...
router.all('/register', async (req, res, next) => {
    // console.log("Inside all()");
    if (req.session['userCredentials'] && req.session.registerOTP && req.session.registerOTP['isVerified']) {
        // console.log("Inside if of all()");
        console.log("One register session already existing. Redirected to completeProfilePage...");
        await logger(req, 'One register session already existing. Redirected to completeProfilePage...');
        res.redirect('/auth/register/completeProfile');
    }
    else if (req.session['userCredentials'] && req.session.registerOTP && req.session.registerOTP['isVerified'] === false) {
        console.log("One register session already existing. Redirected to OTP verification page...");
        await logger(req, 'One register session already existing. Redirected to OTP verification page...');
        res.redirect('/auth/register/verifyEmail');
    }
    else {
        // console.log("Inside else of all()");
        next();
    }
});

router.get('/login', (req, res) => {
    // console.log("Session after:");
    // console.log(req.session);
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        page: 'Login',
        errorMessage: errorMsg,
    };
    res.render('login.ejs', locals);
});

router.post('/login/local', [validateUsername, validatePassword], async (req, res, next) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed for /login/local : ${errorMessages}`);
        await logger(req, `Validation failed: ${errorMessages}`);
        return res.redirect('/auth/login');
    }

    passport.authenticate('local', async (err, user, info) => {
        if (err) {
            console.log(err.message);
            await logger(req, '500: Internal Server Error. Redirected to home page...');
            return res.redirect('/');
        }
        else if (!user) {
            console.log(info);
            await logger(req, info.error);
            return res.redirect('/auth/login');
        }
        req.login(user, async (error) => {
            if (error) {
                console.log(error);
                await logger(req, '500: Internal Server Error. Redirected to home page...');
                return res.redirect('/');
            }
            console.log("User signed in using local.");
            return res.redirect('/user/dashboard');
        });
    })(req, res, next);
});

router.post('/login/jwt', [validateUsername, validatePassword], async (req, res, next) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /login/jwt : ${errorMessages}`);
        await logger(req, `Validation failed: ${errorMessages}`);
        return res.redirect('/auth/login');
    }

    passport.authenticate('local', async (err, user, info) => {
        if (err) {
            console.log(err.message);
            await logger(req, '500: Internal Server Error. Redirected to home page...');
            return res.redirect('/');
        }
        else if (!user) {
            console.log(info);
            await logger(req, info.error);
            return res.redirect('/auth/login');
        }
        const jwtToken = generateJWTToken(user, '1h');
        res.cookie('jwt', jwtToken, { httpOnly: true, maxAge: 1000 * 60 * 60 * 6}); // 6 hours
        req.login(user, async (error) => {
            if (error) {
                console.log(error);
                await logger(req, '500: Internal Server Error. Redirected to home page...');
                return res.redirect('/');
            }
            console.log("User signed in using jwt.");
            return res.redirect('/user/dashboard');
        });
    })(req, res, next);
})

router.get('/register', (req, res) => {
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        page: 'Register',
        errorMessage: errorMsg,
    };
    res.render('register.ejs', locals);
});

router.post('/register/local', [validateUsername, checkUsernameAlreadyExists], async (req, res, next) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /register/local : ${errorMessages}`);
        await logger(req, `Validation failed: ${errorMessages}`);
        return res.redirect('/auth/register');
    }

    const userCredentials = {
        username: req.body['username'],
    };
    userCredentials['authenticator'] = 'local';
    req.session.userCredentials = userCredentials;
    //but now issue is that my server memory has password in raw format, not encrypted or hashed :(
    //soln: we only take username(email) in the register page and complete profile using password and 
    //other details in the complete profile section
    await req.session.save();
    console.log("Session data updated! Added temp userCredentials. Now heading to email verfication section!");
    // res.redirect('/auth/register/completeProfile');
    next();
}, [registerOTPLimiterPerTry, registerOTPLimiterPerDay, registerOTPLimiterPerDayPerIP], verifyEmail);

router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', async (err, user, info) => {
        if (err) {
            console.log(err);
            await logger(req, '500: Internal Server Error. Redirected to home page...');
            return res.redirect('/');
        }
        if(!user) {
            console.log("Google login failed! Heading to home page...");
            return res.redirect('/');
        }
        if (user['uid'] == null) {
            const userCredentials = {
                username: user['username'],
                authenticator: 'google'
            };
            req.session.userCredentials = userCredentials;
            await req.session.save();
            console.log("Session data updated! Added temp userCredentials. Now heading to complete profile section!");
            return res.redirect('/auth/register/completeProfile');
        }
        else {
            req.login(user, async (err) => {
                if (err) {
                    console.log(err);
                    await logger(req, '500: Internal Server Error. Redirected to home page...');
                    return res.redirect('/');
                }
                const jwtToken = generateJWTToken(user, '1h');
                res.cookie('jwt', jwtToken, { httpOnly: true, maxAge: 1000 * 60 * 60 * 6}); // 6 hours
                console.log("JWT Token generated and saved successfully in cookie 'jwt'!");
                console.log("User logged in using google.");
                return res.redirect('/user/dashboard');
            })
        }
    })(req, res, next);
});

router.post('/register/jwt', [validateUsername, checkUsernameAlreadyExists], async (req, res, next) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /register/jwt : ${errorMessages}`);
        await logger(req, `Validation failed: ${errorMessages}`);
        return res.redirect('/auth/register');
    }

    const userCredentials = {
        username: req.body['username'],
    };
    userCredentials['authenticator'] = 'jwt';
    req.session.userCredentials = userCredentials;
    await req.session.save();
    console.log("Session data updated! Added temp userCredentials. Now heading to email verfication section!");
    // res.redirect('/auth/register/completeProfile');
    next();
}, [registerOTPLimiterPerTry, registerOTPLimiterPerDay, registerOTPLimiterPerDayPerIP], verifyEmail);

// Using a middleware(isAuthorizedForCompleteProfile()) to handle validity of 
// req(in '/auth/register/completeProfile' route for all methods), so if a 
// req comes to this middleware it means that it is valid
router.get('/register/completeProfile', (req, res) => {
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        page: 'Complete Profile',
        username: req.session.userCredentials['username'],
        errorMessage: errorMsg,
    };
    res.render('completeProfile.ejs', locals);
});

router.post('/register/completeProfile', [validateNewPassword, validateName, validateRollNo, validateCollegeName, validateCurrSem], async (req, res, next) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /register/completeProfile : ${errorMessages}`);
        await logger(req, `Validation failed: ${errorMessages}`);
        return res.redirect('/auth/register/completeProfile');
    }
    else next();
}, registerUser, assignJWT, async (req, res) => {
    delete req.session['userCredentials'];
    delete req.session['registerOTP'];
    await req.session.save();
    console.log("Session updated after deleting userCredentials & registerOTP from session!");
    await req.session.touch();
    res.redirect('/user/dashboard');
});

router.get('/register/completeProfile/changeUsername', async (req, res) => {
    delete req.session['userCredentials'];
    delete req.session['registerOTP'];
    await req.session.save();
    console.log("Session updated after deleting userCredentials & registerOTP from session and redirecting to register Page for change username!");
    res.redirect('/auth/register');
});

router.get('/register/verifyEmail', async (req, res) => {
    const maxTries = 2;
    const currentTime = Date.now();
    const elapsedTime = Math.floor((currentTime - req.session.registerOTP['issueTime']) / 1000);
    const remainingTime = Math.max(60 - elapsedTime, 0);

    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        tries: maxTries - req.session.registerOTP['failedAttempts'],
        remainingTime: remainingTime,
        username: req.session.userCredentials['username'],
        page: 'Register OTP',
        errorMessage: errorMsg,
    };
    res.render('registerOTP.ejs', locals);
});

router.post('/register/verifyEmail', [validateRegisterOTP], async (req, res) => {
    //here validator also confirms if OTP is correct or not
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.session.registerOTP['failedAttempts']++;
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /register/verifyEmail : ${errorMessages}`);

        if (req.session.registerOTP['failedAttempts'] < 2) {
            await logger(req, `Validation failed: ${errorMessages}`);
            return res.redirect('/auth/register/verifyEmail');
        }
        else {
            delete req.session['userCredentials'];
            delete req.session['registerOTP'];
            await logger(req, `Validation failed(All attempts over!): ${errorMessages}`);
            // await req.session.save();
            console.log("Session updated after deleting userCredentials & registerOTP from session!");
            console.log("Max tries for OTP verification over! Heading to register page...");
            return res.redirect('/auth/register');
        }
    }

    console.log("OTP verified. Now heading to completeProfile page!");
    req.session.registerOTP['isVerified'] = true;
    await req.session.save();
    res.redirect('/auth/register/completeProfile');
});

router.get('/register/verifyEmail/cancel', async (req, res) => {
    delete req.session['userCredentials'];
    delete req.session['registerOTP'];
    await req.session.save();
    console.log("Session updated after deleting userCredentials & registerOTP from session!");
    res.redirect('/auth/register');
});

router.get('/register/verifyEmail/resendOTP', [registerOTPLimiterPerTry, registerOTPLimiterPerDay, registerOTPLimiterPerDayPerIP], async (req, res) => {
    const newOTP = generateOTP();

    const emailStatus = await sendEmail({
        from: '"myCollege Web App" <gaurangdev777@gmail.com>',
        to: req.session.userCredentials['username'],
        subject: 'OTP for user email verification by myCollege Web App',
        text: 'The OTP for the registration as well as email verification is: ' + newOTP,
        html: 'The OTP for the registration as well as email verification is: <strong>' + newOTP + '</strong>',
    });

    if (emailStatus.status) {
        req.session.registerOTP['valueOTP'] = newOTP;
        req.session.registerOTP['failedAttempts'] = 0;
        req.session.registerOTP['issueTime'] = Date.now();
        console.log("New OTP generated and failedAttempts reset to 0.");
        console.log("New OTP: " + newOTP);
        await logger(req, 'New OTP sent successfully!');
        return res.redirect('/auth/register/verifyEmail');
    }
    else {
        delete req.session['userCredentials'];
        delete req.session['registerOTP'];
        console.log("Session updated after deleting userCredentials & registerOTP from session!");

        if (emailStatus.error) {
            console.log("An error occured while sending the email!");
            console.log(emailStatus.error);
            await logger(req, 'An internal server error occured while sending the email!');
        }
        else {
            console.log("Email sending failed! (Invalid email)");
            await logger(req, 'Email sending failed! (Invalid Email)');
        }
        return res.redirect('/auth/register');
    }
});

router.get('/login/forgotPassword/username', async (req, res) => {
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        page: 'Forgot Password Username',
        errorMessage: errorMsg,
    };
    res.render('forgotPassUsername.ejs', locals);
});

router.post('/login/forgotPassword/username', [validateUsername, checkUsernameRegistered], async (req, res, next) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /login/forgotPassword/username : ${errorMessages}`);
        await logger(req, `Validation failed: ${errorMessages}`);
        return res.redirect('/auth/login/forgotPassword/username');
    }

    const forgotUserCredentials = {
        username: req.body['username'],
    };
    req.session.forgotUserCredentials = forgotUserCredentials;
    await req.session.save();
    console.log("Session data updated! Added temp forgotUserCredentials. Now heading to email verfication section!");
    next();
}, [forgotOTPLimiterPerTry, forgotOTPLimiterPerDay, forgotOTPLimiterPerDayPerIP], forgotVerifyEmail);

router.get('/login/forgotPassword/otp', async (req, res) => {
    const maxTries = 2;
    const currentTime = Date.now();
    const elapsedTime = Math.floor((currentTime - req.session.forgotOTP['issueTime']) / 1000);
    const remainingTime = Math.max(60 - elapsedTime, 0);

    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        tries: maxTries - req.session.forgotOTP['failedAttempts'],
        remainingTime: remainingTime,
        username: req.session.forgotUserCredentials['username'],
        page: 'Forgot Password OTP',
        errorMessage: errorMsg,
    };
    res.render('forgotPassOTP.ejs', locals);
});

router.post('/login/forgotPassword/otp', [validateForgotOTP], async (req, res, next) => {
    //here validator also confirms if OTP is correct or not
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.session.forgotOTP['failedAttempts']++;
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /login/forgotPassword/otp : ${errorMessages}`);

        if (req.session.forgotOTP['failedAttempts'] < 2) {
            await logger(req, `Validation failed: ${errorMessages}`);
            return res.redirect('/auth/login/forgotPassword/otp');
        }
        else {
            delete req.session['forgotUserCredentials'];
            delete req.session['forgotOTP'];
            await logger(req, `Validation failed(All attempts over!): ${errorMessages}`);
            // await req.session.save();
            console.log("Session updated after deleting forgotUserCredentials & forgotOTP from session!");
            console.log("Max tries for OTP verification over! Heading to login page...");
            return res.redirect('/auth/login');
        }
    }

    console.log("OTP verified. Now heading to change password page!");
    req.session.forgotOTP['isVerified'] = true;
    await req.session.save();
    res.redirect('/auth/login/forgotPassword/newPassword');
});

router.get('/login/forgotPassword/otp/cancel', async (req, res) => {
    delete req.session['forgotUserCredentials'];
    delete req.session['forgotOTP'];
    await req.session.save();
    console.log("Session updated after deleting forgotUserCredentials & forgotOTP from session!");
    res.redirect('/auth/login');
});

router.get('/login/forgotPassword/otp/resendOTP', [forgotOTPLimiterPerTry, forgotOTPLimiterPerDay, forgotOTPLimiterPerDayPerIP], async (req, res) => {
    const newOTP = generateOTP();

    const emailStatus = await sendEmail({
        from: '"myCollege Web App" <gaurangdev777@gmail.com>',
        to: req.session.forgotUserCredentials['username'],
        subject: 'OTP for user email verification by myCollege Web App',
        text: 'The OTP for forgot password email verification is: ' + newOTP,
        html: 'The OTP for forgot password email verification is: <strong>' + newOTP + '</strong>',
    });

    if (emailStatus.status) {
        req.session.forgotOTP['valueOTP'] = newOTP;
        req.session.forgotOTP['failedAttempts'] = 0;
        req.session.forgotOTP['issueTime'] = Date.now();
        console.log("New OTP generated and failedAttempts reset to 0.");
        console.log("New OTP: " + newOTP);
        await logger(req, 'New OTP sent successfully!');
        return res.redirect('/auth/login/forgotPassword/otp');
    }
    else {
        delete req.session['forgotUserCredentials'];
        delete req.session['forgotOTP'];
        console.log("Session updated after deleting forgotUserCredentials & forgotOTP from session!");

        if (emailStatus.error) {
            console.log("An error occured while sending the email!");
            console.log(emailStatus.error);
            await logger(req, 'An internal server error occured while sending the email!');
        }
        else {
            console.log("Email sending failed! (Invalid email)");
            await logger(req, 'Email sending failed! (Invalid Email)');
        }
        return res.redirect('/auth/login/forgotPassword/username');
    }
});

router.get('/login/forgotPassword/newPassword', async (req, res) => {
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        page: 'Forgot Password New Password',
        username: req.session.forgotUserCredentials['username'],
        errorMessage: errorMsg,
    };
    res.render('forgotPassNewPass.ejs', locals);
});

router.post('/login/forgotPassword/newPassword', [validateChangeRepeatNewPassword, validateChangeNewPassword], async (req, res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /auth/login/forgotPassword/newPassword (post) : ${errorMessages}`);
        await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.redirect('/auth/login/forgotPassword/newPassword');
    }

    await forgotChangePassword(req, res);
});

router.get('/login/forgotPassword/newPassword/cancel', async (req, res) => {
    delete req.session['forgotUserCredentials'];
    delete req.session['forgotOTP'];
    await req.session.save();
    console.log("Session updated after deleting forgotUserCredentials & forgotOTP from session!");
    res.redirect('/auth/login');
});

router.post('/logout', (req, res) => {
    req.logout(async (err) => {
        if (err) {
            console.log("Logout error: ", err);
            await logger(req, '500: Internal Server Error. Redirected to home page...');
            return res.redirect('/');
        }
        req.session.destroy(async (err) => {
            if (err) {
                console.log("Session destroy error: ", err);
                await logger(req, '500: Internal Server Error. Redirected to home page...');
                return res.redirect('/');
            }
            //Web browsers and other compliant clients will only clear the cookie if the given options is identical to those given to res.cookie(), excluding expires and maxAge.
            res.clearCookie('jwt', { httpOnly: true });
            console.log("User logged out...");
            return res.redirect('/');
        });
    });
});


export default router;