import pool from "../config/db.js";
import passport from "passport";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import env from "dotenv";

import { logger } from "../utils/errorLogger.js";
import { sendEmail } from "../utils/EmailService.js";

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
        from: '"myCollege Web App" <gaurangdev777@gmail.com>',
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
        from: '"myCollege Web App" <gaurangdev777@gmail.com>',
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
        const jwtToken = generateJWTToken(req.user, '1h');
        res.cookie('jwt', jwtToken, { httpOnly: true, maxAge: 1000 * 60 * 60 * 6}); // 6 hours
        console.log("JWT Token generated and saved successfully in cookie 'jwt'!");
    }
    else if (authenticator != 'local' && authenticator != 'google') {
        console.log("Invalid authenticator value!");
        await logger(req, 'Invalid authentication details. Redirected to register page...');
        res.redirect('/auth/register');
    }
    next();
}

export const generateJWTToken = (payload, expiresIn) => {
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiresIn });
    return jwtToken;
}

export const forgotChangePassword = async (req, res) => {
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

export const generateOTP = () => {
    let val = '';
    for (let i = 0; i < 4; i++) {
        let a1 = Math.floor(Math.random() * 10);
        val += a1.toString();
    }
    return val;
}