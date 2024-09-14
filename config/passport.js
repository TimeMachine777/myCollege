import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import pool from "./db.js";
import bcrypt from "bcrypt";
import env from "dotenv";

env.config();

const localStrategy = new LocalStrategy(async function verify(username, password, done) {
    try {
        const results = await pool.query('select * from users where username=$1', [username]);
        // console.log("inside try of verify of local passport!"); //testing
        if (results.rows.length === 0) {
            let errorMsg = "Incorrect username. Try again!";
            console.log(errorMsg);
            done(null, false, { error: errorMsg });
        }
        else {
            let storedPassword = results.rows[0]['password'];
            const compareResult = await bcrypt.compare(password, storedPassword);
            if (compareResult) {
                done(null, {
                    uid: results.rows[0]['uid'],
                    username: username,
                    current_sem: results.rows[0]['current_sem']
                });
            }
            else {
                let errorMsg = "Incorrect password. Try again!";
                console.log(errorMsg);
                done(null, false, { error: errorMsg });
            }
        }
    }
    catch (error) {
        console.log(error);
        done(error);
    }
});

const googleStrategy = new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async function verify(accessToken, refreshToken, profile, done) {
    // console.log(profile);
    try {
        const results = await pool.query('select * from users where username=$1', [profile.email]);
        if (results.rows.length === 0) {
            console.log("New user! Redirecting to complete profile page...");
            done(null, {
                uid: null,
                username: profile.email,
                current_sem: null
            }, { messages: "New user. Redirect to complete profile page." });
        }
        else {
            console.log("User already registered! Redirecting to dashboard...");
            done(null, {
                uid: results.rows[0]['uid'],
                username: profile.email,
                current_sem: results.rows[0]['current_sem']
            });
        }
    }
    catch (error) {
        console.log(error);
        done(error);
    }
});

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use('local', localStrategy);
passport.use('google', googleStrategy);
