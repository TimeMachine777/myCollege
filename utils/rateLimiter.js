import { rateLimit } from 'express-rate-limit';
import { logger } from './errorLogger.js';

// Register OTP rate limiters ------------------------

export const registerOTPLimiterPerTry = rateLimit({
	windowMs: 1 * 60 * 1000, //1 min
	limit: 1, 
	standardHeaders: true, 
	legacyHeaders: false, 
    handler: async (req,res,next,options) => {
        console.log("Client exceeded rate limit for resend OTP between 2 tries!");
        await logger(req,'Rate limit exceeded for resend OTP (allowed 1 request per 1 min)!');
        if(req.session['registerOTP'])
            res.redirect('/auth/register/verifyEmail');
        else {
            delete req.session['userCredentials'];
            await req.session.save();
            res.redirect('/auth/register');
        }
    },
    keyGenerator: (req,res) => req.session.userCredentials['username'],
});

export const registerOTPLimiterPerDay = rateLimit({
	windowMs: 24 * 60 * 60 * 1000, //1 day
	limit: 4, 
	standardHeaders: true, 
	legacyHeaders: false, 
    handler: async (req,res,next,options) => {
        console.log("Client(username) exceeded rate limit for OTP per day!");
        await logger(req,'Rate limit exceeded for OTP (allowed 4 request per day for an username)!');
        if(req.session['registerOTP'])
            res.redirect('/auth/register/verifyEmail');
        else {
            delete req.session['userCredentials'];
            await req.session.save();
            res.redirect('/auth/register');
        }
    },
    keyGenerator: (req,res) => req.session.userCredentials['username'],
});

export const registerOTPLimiterPerDayPerIP = rateLimit({
	windowMs: 24 * 60 * 60 * 1000, //1 day
	limit: 8, 
	standardHeaders: true, 
	legacyHeaders: false, 
    handler: async (req,res,next,options) => {
        console.log("Client(IP address) exceeded rate limit for OTP per day!");
        await logger(req,'Rate limit exceeded for OTP (allowed 8 request per day for an IP address)!');
        if(req.session['registerOTP'])
            res.redirect('/auth/register/verifyEmail');
        else {
            delete req.session['userCredentials'];
            await req.session.save();
            res.redirect('/auth/register');
        }
    },
});


// Forgot OTP rate limiters --------------------

export const forgotOTPLimiterPerTry = rateLimit({
	windowMs: 1 * 60 * 1000, //1 min
	limit: 1, 
	standardHeaders: true, 
	legacyHeaders: false, 
    handler: async (req,res,next,options) => {
        console.log("Client exceeded rate limit for resend OTP between 2 tries!");
        await logger(req,'Rate limit exceeded for resend OTP (allowed 1 request per 1 min)!');
        if(req.session['forgotOTP'])
            res.redirect('/auth/login/forgotPassword/otp');
        else {
            delete req.session['forgotUserCredentials'];
            await req.session.save();
            res.redirect('/auth/login/forgotPassword/username');
        }
    },
    keyGenerator: (req,res) => req.session.forgotUserCredentials['username'],
});

export const forgotOTPLimiterPerDay = rateLimit({
	windowMs: 24 * 60 * 60 * 1000, //1 day
	limit: 4, 
	standardHeaders: true, 
	legacyHeaders: false, 
    handler: async (req,res,next,options) => {
        console.log("Client(username) exceeded rate limit for OTP per day!");
        await logger(req,'Rate limit exceeded for OTP (allowed 4 request per day for an username)!');
        if(req.session['forgotOTP'])
            res.redirect('/auth/login/forgotPassword/otp');
        else {
            delete req.session['forgotUserCredentials'];
            await req.session.save();
            res.redirect('/auth/login/forgotPassword/username');
        }
    },
    keyGenerator: (req,res) => req.session.forgotUserCredentials['username'],
});

export const forgotOTPLimiterPerDayPerIP = rateLimit({
	windowMs: 24 * 60 * 60 * 1000, //1 day
	limit: 8, 
	standardHeaders: true, 
	legacyHeaders: false, 
    handler: async (req,res,next,options) => {
        console.log("Client(IP address) exceeded rate limit for OTP per day!");
        await logger(req,'Rate limit exceeded for OTP (allowed 8 request per day for an IP address)!');
        if(req.session['forgotOTP'])
            res.redirect('/auth/login/forgotPassword/otp');
        else {
            delete req.session['userCredentials'];
            await req.session.save();
            res.redirect('/auth/login/forgotPassword/username');
        }
    },
});