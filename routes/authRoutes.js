import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";

import { logger } from "../utils/errorLogger.js";
import { registerUser, assignJWT, verifyEmail, generateJWTToken, generateOTP } from "../controllers/authController.js";
import { validateUsername, validatePassword, validateNewPassword, validateName, validateRollNo, validateCollegeName, validateCurrSem, checkUsernameAlreadyExists, validateOTP } from "../validators/authValidator.js";
import { registerOTPLimiterPerTry, registerOTPLimiterPerDay, registerOTPLimiterPerDayPerIP } from "../utils/rateLimiter.js";
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
        res.cookie('jwt', jwtToken, { httpOnly: true, maxAge: 1000 * 60 * 60 });
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
                res.cookie('jwt', jwtToken, { httpOnly: true, maxAge: 1000 * 60 * 60 });
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
        errorMessage: errorMsg,
    };
    res.render('registerOTP.ejs', locals);
});

router.post('/register/verifyEmail', [validateOTP], async (req, res) => {
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
            return res.redirect('/auth/register');
        }
    }
    return res.redirect('/auth/register/verifyEmail');
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