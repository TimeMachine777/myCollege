import pool from "../config/db.js";
import passport from "passport";
import bcrypt from "bcrypt";
import env from "dotenv";

import { logger } from "../utils/errorLogger.js";
import { sendEmail } from "../utils/emailService.js";
import { generateJWTToken, generateOTP } from "../utils/misc.js";
import { body, validationResult } from "express-validator";

env.config();

/* import express from "express";
const app=express();

app.get('/',(req,res)=> {
    req.login();
    req.displayError
    // res.status(401).redirect('/register');
}) */


export const verifyEmail = async (req, res, next) => {
    // const authenticator = req.session.userCredentials['authenticator'];
    //verify email process
    const newOTP = generateOTP();

    const emailStatus = await sendEmail({
        from: `"myCollege Web App" <${process.env.EMAIL_FROM}>`,
        to: req.session.userCredentials['username'],
        subject: 'OTP for user email verification by myCollege Web App',
        text: 'The OTP for the registration as well as email verification is: ' + newOTP,
        html: 'The OTP for the registration as well as email verification is: <strong>' + newOTP + '</strong>',
    });


    if (emailStatus.status) {
        req.session['registerOTP'] = {
            isVerified: false,
            failedAttempts: 0,
            valueOTP: newOTP,
            issueTime: Date.now(),
        };
        await req.session.save();
        console.log("Session updated after adding registerOTP!");
        console.log("Generated OTP:" + newOTP); //testing
        console.log("Email sent successfully!");
        await logger(req, 'OTP sent successfully!');
        return res.redirect('/auth/register/verifyEmail');
    }
    else {
        delete req.session['userCredentials'];
        // delete req.session['registerOTP'];
        console.log("Session updated after deleting userCredentials from session!");

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
};

export const forgotVerifyEmail = async (req, res, next) => {
    const newOTP = generateOTP();

    const emailStatus = await sendEmail({
        from: `"myCollege Web App" <${process.env.EMAIL_FROM}>`,
        to: req.session.forgotUserCredentials['username'],
        subject: 'OTP for user email verification by myCollege Web App',
        text: 'The OTP for forgot password email verification is: ' + newOTP,
        html: 'The OTP for forgot password email verification is: <strong>' + newOTP + '</strong>',
    });


    if (emailStatus.status) {
        req.session['forgotOTP'] = {
            isVerified: false,
            failedAttempts: 0,
            valueOTP: newOTP,
            issueTime: Date.now(),
        };
        await req.session.save();
        console.log("Session updated after adding forgotOTP!");
        console.log("Generated OTP:" + newOTP); //testing
        console.log("Email sent successfully!");
        await logger(req, 'OTP sent successfully!');
        return res.redirect('/auth/login/forgotPassword/otp');
    }
    else {
        delete req.session['forgotUserCredentials'];
        // delete req.session['forgotOTP'];
        console.log("Session updated after deleting userCredentials from session!");

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
}

export const registerUser = async (req, res, next) => {
    // console.log(req.session);
    const userCredentialsCopy = req.session['userCredentials'];
    const username = userCredentialsCopy['username'];
    const { password, name, roll_no, college, current_sem } = req.body;
    try {
        // console.log(typeof(process.env.BCRYPT_SALT_ROUNDS));
        // No longer needed this check as this is performed by the validator in the AuthRoutes.js file
        /* const checkResult=await pool.query('select * from users where username=$1',[username]);
        if(checkResult.rows.length!=0) {
            console.log("Error! This username is already registered, heading to login page...");
            delete req.session['userCredentials'];
            await req.session.save();
            console.log("Session updated after deleting userCredentials from session!");
            await logger(req,"The username: "+username+" is already registered. Please log in...");
            res.redirect('/auth/login');
        }
        else{ */
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS));
        const result = await pool.query('insert into users(username,password,name,roll_no,college,current_sem) values($1,$2,$3,$4,$5,$6) returning uid', [username, hashedPassword, name, roll_no, college, current_sem]);
        console.log("User registered successfully with username: " + username);
        let user = {
            uid: result.rows[0]['uid'],
            username: username,
            current_sem: current_sem
        };
        req.login(user, async (error) => {
            if (error) {
                console.log("login error in local register controller:\n" + error);
                await logger(req, '500: Internal Server Error. Redirected to home page...');
                res.redirect('/');
            }
            console.log("User logged in successfully after registering!");
            // res.redirect('user/dashboard');
            //as the session is now reset, so im again adding the userCredentials obj to session
            req.session['userCredentials'] = userCredentialsCopy;
            next();
        });
        // }
    }
    catch (error) {
        console.log(error);
        await logger(req, '500: Internal Server Error. Redirected to home page...');
        res.redirect('/');
    }
}

export const assignJWT = async (req, res, next) => {
    // console.log(req.session);
    const authenticator = req.session.userCredentials['authenticator'];
    if (authenticator == 'jwt') {
        const jwtToken = generateJWTToken(req.user, '6h');
        res.cookie('jwt', jwtToken, { httpOnly: true, maxAge: 1000 * 60 * 60 * 6 }); // 6 hours
        console.log("JWT Token generated and saved successfully in cookie 'jwt'!");
    }
    else if (authenticator != 'local' && authenticator != 'google') {
        console.log("Invalid authenticator value!");
        await logger(req, 'Invalid authentication details. Redirected to register page...');
        res.redirect('/auth/register');
    }
    next();
}

const forgotChangePassword = async (req, res) => {
    const { new_password } = req.body;
    try {
        const results = await pool.query('select password from users where username=$1', [req.session.forgotUserCredentials['username']]);
        const storedPassword = results.rows[0]['password'];
        const compareResult = await bcrypt.compare(new_password, storedPassword);
        if (compareResult) {
            console.log("New password must be different from the existing password!");
            await logger(req, 'New password must be different from the existing password!');
            return res.redirect('/auth/login/forgotPassword/newPassword');
        }
        else {
            const hashedNewPassword = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_SALT_ROUNDS));
            await pool.query('update users set password=$1 where username=$2', [hashedNewPassword, req.session.forgotUserCredentials['username']]);
            console.log("User password changed successfully!");
            await logger(req, 'User password changed successfully!');
            return res.redirect('/auth/login');
        }
    }
    catch (error) {
        console.log(error);
        await logger(req, 'Some error occured while changing the password!');
        return res.redirect('/auth/login');
    }
};

// Main route handlers --------------------------------------

export const allRegister = async (req, res, next) => {
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
};

export const getLogin = (req, res) => {
    // console.log("Session after:");
    // console.log(req.session);
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        page: 'Login',
        errorMessage: errorMsg,
    };
    res.render('login.ejs', locals);
}

export const postLoginLocal = async (req, res, next) => {
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
}

export const postLoginJWT = async (req, res, next) => {
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
        const jwtToken = generateJWTToken(user, '6h');
        res.cookie('jwt', jwtToken, { httpOnly: true, maxAge: 1000 * 60 * 60 * 6 }); // 6 hours
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
}

export const getRegister = (req, res) => {
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        page: 'Register',
        errorMessage: errorMsg,
    };
    res.render('register.ejs', locals);
}

export const postRegisterLocal = async (req, res, next) => {
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
}

export const getGoogle = passport.authenticate('google', {
    scope: ['profile', 'email']
})

export const getGoogleCallback = (req, res, next) => {
    passport.authenticate('google', async (err, user, info) => {
        if (err) {
            console.log(err);
            await logger(req, '500: Internal Server Error. Redirected to home page...');
            return res.redirect('/');
        }
        if (!user) {
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
                const jwtToken = generateJWTToken(user, '6h');
                res.cookie('jwt', jwtToken, { httpOnly: true, maxAge: 1000 * 60 * 60 * 6 }); // 6 hours
                console.log("JWT Token generated and saved successfully in cookie 'jwt'!");
                console.log("User logged in using google.");
                return res.redirect('/user/dashboard');
            })
        }
    })(req, res, next);
}

export const postRegisterJWT = async (req, res, next) => {
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
}

export const getRegisterCompleteProfile = (req, res) => {
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        page: 'Complete Profile',
        username: req.session.userCredentials['username'],
        errorMessage: errorMsg,
    };
    res.render('completeProfile.ejs', locals);
}

export const postRegisterCompleteProfile1 = async (req, res, next) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /register/completeProfile : ${errorMessages}`);
        await logger(req, `Validation failed: ${errorMessages}`);
        return res.redirect('/auth/register/completeProfile');
    }
    else next();
}

export const postRegisterCompleteProfile2 = async (req, res) => {
    delete req.session['userCredentials'];
    delete req.session['registerOTP'];
    await req.session.save();
    console.log("Session updated after deleting userCredentials & registerOTP from session!");
    await req.session.touch();
    res.redirect('/user/dashboard');
}

export const getRegisterCompleteProfileChangeUsername = async (req, res) => {
    delete req.session['userCredentials'];
    delete req.session['registerOTP'];
    await req.session.save();
    console.log("Session updated after deleting userCredentials & registerOTP from session and redirecting to register Page for change username!");
    res.redirect('/auth/register');
}

export const getRegisterVerifyEmail = async (req, res) => {
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
}

export const postRegisterVerifyEmail = async (req, res) => {
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
}

export const getRegisterVerifyEmailCancel = async (req, res) => {
    delete req.session['userCredentials'];
    delete req.session['registerOTP'];
    await req.session.save();
    console.log("Session updated after deleting userCredentials & registerOTP from session!");
    res.redirect('/auth/register');
}

export const getRegisterVerifyEmailResendOTP = async (req, res) => {
    const newOTP = generateOTP();

    const emailStatus = await sendEmail({
        from: `"myCollege Web App" <${process.env.EMAIL_FROM}>`,
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
}

export const getLoginForgotPasswordUsername = async (req, res) => {
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        page: 'Forgot Password Username',
        errorMessage: errorMsg,
    };
    res.render('forgotPassUsername.ejs', locals);
}

export const postLoginForgotPasswordUsername = async (req, res, next) => {
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
}

export const getLoginForgotPasswordOTP = async (req, res) => {
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
}

export const postLoginForgotPasswordOTP = async (req, res, next) => {
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
}

export const getLoginForgotPasswordOTPCancel = async (req, res) => {
    delete req.session['forgotUserCredentials'];
    delete req.session['forgotOTP'];
    await req.session.save();
    console.log("Session updated after deleting forgotUserCredentials & forgotOTP from session!");
    res.redirect('/auth/login');
}

export const getLoginForgotPasswordOTPResendOTP = async (req, res) => {
    const newOTP = generateOTP();

    const emailStatus = await sendEmail({
        from: `"myCollege Web App" <${process.env.EMAIL_FROM}>`,
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
}

export const getLoginForgotPasswordNewPassword = async (req, res) => {
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        page: 'Forgot Password New Password',
        username: req.session.forgotUserCredentials['username'],
        errorMessage: errorMsg,
    };
    res.render('forgotPassNewPass.ejs', locals);
}

export const postLoginForgotPasswordNewPassword = async (req, res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /auth/login/forgotPassword/newPassword (post) : ${errorMessages}`);
        await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.redirect('/auth/login/forgotPassword/newPassword');
    }

    await forgotChangePassword(req, res);
}

export const getLoginForgotPasswordNewPasswordCancel = async (req, res) => {
    delete req.session['forgotUserCredentials'];
    delete req.session['forgotOTP'];
    await req.session.save();
    console.log("Session updated after deleting forgotUserCredentials & forgotOTP from session!");
    res.redirect('/auth/login');
}

export const postLogout = (req, res) => {
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
}