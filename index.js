import express from "express";
import env from "dotenv";
import passport from "passport";
import session from "express-session";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import { isAuthorizedForCompleteProfile, isAuthenticated, isAlreadyLoggedIn, isAuthorizedForRegisterOTP } from "./controllers/authController.js";
import authRoutes from "./routes/authRoutes.js";
import rootRoutes from "./routes/rootRoutes.js";
import userRoutes from "./routes/userRoutes.js";

import './config/passport.js';

//---------------------import ends--------------------

env.config();
const app=express();

//------------------middlewares ------------------------
//public folder
app.use(express.static('public'));

//body parsing
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//cookie extraction from req using a prebuilt module: cookie-parser
app.use(cookieParser(process.env.SESSION_SECRET));

//session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000*60*60,
    }
}));

//passport
app.use(passport.initialize());
app.use(passport.session());

//jwt auth
app.use(async (req,res,next) => {
    // console.log("Inside jwt auth middleware in index.js");
    if(!req.user) {
        let token;
        // console.log(req.cookies);
        if(req.cookies) token=req.cookies['jwt'];
        else if(req.headers['authorization']) token=req.headers['authorization'].split(' ')[1];
        // console.log("token is:"+token);
        if(token) {
            const decoded=jwt.verify(token,process.env.JWT_SECRET);
            delete decoded['iat'];
            delete decoded['exp'];
            await new Promise((resolve,reject) => {
                req.login(decoded, (error) => {
                    if(error) {
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
    }
    // console.log(req.session);
    next();
});

//others
app.use('/auth/register/completeProfile',isAuthorizedForCompleteProfile);
app.use('/auth/register/verifyEmail',isAuthorizedForRegisterOTP);
app.use(['/auth/login','/auth/register','/auth/google'],isAlreadyLoggedIn);
app.use('/user',isAuthenticated);

//----------------middleware ends----------------------

//----------------routes start ------------------------
app.use('/', rootRoutes);
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
//----------------routes end---------------------------


//use at the end so that if no route is activated, this is the default action!
app.use((req, res, next) => {
    res.status(404).send("Sorry can't find that!")
})

app.listen(process.env.PORT, (err) => {
    console.log(`Server is running at http://localhost:${process.env.PORT}.`);
})