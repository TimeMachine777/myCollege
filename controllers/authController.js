import pool from "../config/db.js";
import passport from "passport";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import env from "dotenv";

import { logger } from "../utils/errorLogger.js";

env.config();

/* import express from "express";
const app=express();

app.get('/',(req,res)=> {
    req.login();
    req.displayError
    // res.status(401).redirect('/register');
}) */


export const verifyEmail = async (req, res, next) => {
    const authenticator = req.session.userCredentials['authenticator'];
    if (authenticator != 'google') {
        //verify email process
    }
    req.session.touch();
    next();
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
        res.cookie('jwt', jwtToken, { httpOnly: true, maxAge: 1000 * 60 * 60 });
        console.log("JWT Token generated and saved successfully in cookie 'jwt'!");
    }
    else if (authenticator != 'local' && authenticator != 'google') {
        console.log("Invalid authenticator value!");
        await logger(req, 'Invalid authentication details. Redirected to register page...');
        res.redirect('/register');
    }
    next();
}

export const generateJWTToken = (payload, expiresIn) => {
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiresIn });
    return jwtToken;
}

export const changePassword = async (req, res, next) => {
    const { curr_password, new_password } = req.body;
    try {
        const results = await pool.query('select password from users where uid=$1', [req.user['uid']]);
        const storedPassword = results.rows[0]['password'];
        const compareResult = await bcrypt.compare(curr_password, storedPassword);
        if (!compareResult) {
            console.log("Curr password entered does not match the actual password!");
            return res.json({
                success: false,
                errors: 'Curr password entered does not match the actual password!',
            });
        }
        else if(curr_password===new_password) {
            console.log("New password must be different from the existing password!");
            return res.json({
                success: false,
                errors: 'New password must be different from the existing password!',
            });
        }
        else {
            const hashedNewPassword = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_SALT_ROUNDS));
            await pool.query('update users set password=$1 where uid=$2', [hashedNewPassword, req.user['uid']]);
            console.log("User password changed successfully!");
            await logger(req,'User password changed successfully!');
            res.json({ success: true });
        }
    }
    catch (error) {
        console.log(error);
        return res.json({ success: false });
    }
}

export const isAuthorizedForCompleteProfile = async (req, res, next) => {
    if (req.session && req.session['userCredentials']) {
        // console.log(req.session['userCredentials']);
        next();
    }
    else {
        console.log("User is not authorized for this request in completeProfile endpoint!");
        await logger(req, 'User is not authorized for this request in completeProfile endpoint!');
        res.redirect('/auth/register');
    }
}

export const isAuthenticated = async (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    }
    else {
        console.log("User not authorized for this section!");
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