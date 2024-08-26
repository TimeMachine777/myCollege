import pool from "../config/db.js";
import bcrypt from "bcrypt";
import env from "dotenv";

import { logger } from "../utils/errorLogger.js";
import { getLocalISODateTime } from "../utils/misc.js";
import { body, validationResult } from "express-validator";

env.config();


const getAllSem = async (req, res) => {
    let allSem = [];
    try {
        const result = await pool.query('(select sem from academics where uid=$1) union (select sem from events where uid=$1) order by sem', [req.user['uid']]);
        const data = result.rows;
        for (let i of data) {
            allSem.push(Number(i['sem']));
        }
    }
    catch (error) {
        console.log(error);
        await logger(req,'500: Internal Server Error. Redirected to home page...');
        res.redirect('/');
    }
    return allSem;
}

const getAllCourses = async (req, res, currSem) => {
    try {
        const results = await pool.query('select course_name,cid,professor,dept,credits from academics where uid=$1 and sem=$2 order by course_name asc', [req.user['uid'], currSem]);
        return results.rows;
    }
    catch (error) {
        console.log(error);
        await logger(req,'500: Internal Server Error. Redirected to home page...');
        res.redirect('/user/dashboard');
    }
}

const addCourse = async (req, res) => {
    const { course_name, cid, professor, dept, credits, sem } = req.body;
    // console.log(typeof(sem));
    try {
        await pool.query('insert into academics(uid,cid,sem,course_name,professor,dept,credits) values($1,$2,$3,$4,$5,$6,$7)', [req.user['uid'], cid, Number(sem), course_name, professor, dept, Number(credits)]);
        console.log("Course added successfully!");
        res.json({ success: true });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false });
    }
}

const updateCourse = async (req, res) => {
    const { course_name, cid, professor, dept, credits, sem, prev_cid } = req.body;
    // console.log(req.body);
    // console.log(typeof(req.user['uid']));
    // console.log(Number(credits));
    // console.log(typeof(credits));
    // console.log(typeof(sem));
    let updateQueryFields = 'update academics set course_name=$1,professor=$2,dept=$3,credits=$4,sem=$5';
    let updateQueryCondition = ' where uid=$6 and cid=$7';
    let QueryParameter = [course_name, professor, dept, Number(credits), Number(sem), req.user['uid'], prev_cid];
    if (cid != prev_cid) {
        updateQueryFields += ',cid=$8';
        QueryParameter.push(cid);
    }
    const FinalQuery = updateQueryFields + updateQueryCondition;
    // console.log(FinalQuery);
    // console.log(QueryParameter);
    try {
        await pool.query(FinalQuery, QueryParameter);
        console.log("Course: " + prev_cid + " updated successfully!");
        res.json({ success: true });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false });
    }
}

const deleteCourse = async (req, res) => {
    const { cid } = req.body;
    try {
        await pool.query('delete from academics where uid=$1 and cid=$2', [req.user['uid'], cid]);
        console.log("Course: " + cid + " deleted!");
        res.json({ success: true });
    }
    catch (error) {
        console.log("Error in deleting course: " + cid);
        console.log(error);
        res.json({ success: false });
    }
}

const getAllCoursesForAttendance = async (req, res, currSem) => {
    try {
        const results = await pool.query('select cid,course_name,professor,credits,present,total_classes from academics where uid=$1 and sem=$2 order by course_name asc', [req.user['uid'], currSem]);
        return results.rows;
    }
    catch (error) {
        console.log(error);
        await logger(req,'500: Internal Server Error. Redirected to home page...');
        res.redirect('/user/dashboard');
    }
};

const getAttendanceDetails = async (req, res) => {
    const uid = req.user['uid'];
    const cid = req.body['cid'];
    // console.log([uid,cid]);
    try {
        const result = await pool.query('select aid,course_date,status from attendance where uid=$1 and cid=$2 order by course_date desc', [uid, cid]);
        // console.log(result.rows);
        res.json({
            success: true,
            attendance: result.rows
        });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false });
    }
};

const addAttendance = async (req, res) => {
    const { cid, course_date, status } = req.body;

    const client = await pool.connect();
    try {
        await client.query('begin'); //transaction begins -----------
        await client.query('insert into attendance(uid,cid,course_date,status) values($1,$2,$3,$4)', [req.user['uid'], cid, course_date, status]);

        let presentToAdd = 0;
        if (status == 'P') presentToAdd = 1;
        await client.query('update academics set present=present+$1,total_classes=total_classes+1 where uid=$2 and cid=$3', [presentToAdd, req.user['uid'], cid]);

        await client.query('commit');
        console.log("Attendance added successfully!");
        res.json({ success: true });
    }
    catch (error) {
        await client.query('rollback');
        console.log(error);
        res.json({ success: false });
    }
    finally {
        client.release();
    }
}

const updateAttendance = async (req, res) => {
    const { aid, cid, course_date, status, prev_status } = req.body;

    //taking a client (because next is a multioperation transaction so we need a single client for it
    //because by default the pool.query acts as a single op transaction and begins and commits around
    //the pool.query(). So if we need to do multi operation transactions we need a client for it.)
    const client = await pool.connect();
    try {
        await client.query('begin'); //transaction begins -----------
        await client.query('update attendance set course_date=$1,status=$2 where aid=$3', [course_date, status, aid]);

        let presentToReduce = 0;
        if (prev_status == 'P' && status == 'A') presentToReduce = 1;
        else if (prev_status == 'A' && status == 'P') presentToReduce = -1;
        await client.query('update academics set present=present-$1 where uid=$2 and cid=$3', [presentToReduce, req.user['uid'], cid]);

        await client.query('commit');
        console.log("Attendance updated successfully!");
        res.json({ success: true });
    }
    catch (error) {
        await client.query('rollback');
        console.log(error);
        res.json({ success: false });
    }
    finally {
        client.release();
    }
}

const deleteAttendance = async (req, res) => {
    const { aid, cid, prev_status } = req.body;
    const client = await pool.connect(); //taking a client for multi op transaction
    try {
        await client.query('begin');
        await client.query('delete from attendance where aid=$1', [aid]);

        const presentToReduce = (prev_status == 'P') ? 1 : 0;
        await client.query('update academics set present=present-$1,total_classes=total_classes-1 where uid=$2 and cid=$3', [presentToReduce, req.user['uid'], cid]);

        await client.query('commit');
        console.log("Attendance deleted successfully!");
        res.json({ success: true });
    }
    catch (error) {
        await client.query('rollback');
        console.log(error);
        res.json({ success: false });
    }
    finally {
        client.release();
    }
};

const getAllMarks = async (req, res, currSem) => {
    try {
        const marksResult = await pool.query('select cid,course_name,quiz1,mid_sem,quiz2,end_sem,internal,total_marks from academics where uid=$1 and sem=$2 order by cid', [req.user['uid'], currSem]);
        return marksResult.rows;
    }
    catch (error) {
        console.log(error);
        await logger(req,'500: Internal Server Error. Redirected to home page...');
        res.redirect('/user/dashboard');
    }
};

const updateMarks = async (req, res) => {
    let quiz1 = Number(req.body['quiz1'] || 0);
    let quiz2 = Number(req.body['quiz2'] || 0);
    let mid_sem = Number(req.body['mid_sem'] || 0);
    let end_sem = Number(req.body['end_sem'] || 0);
    let internal = Number(req.body['internal'] || 0);
    const total_marks = Number(quiz1 + mid_sem + quiz2 + end_sem + internal);
    const cid = req.body['cid'];

    if (!req.body['quiz1']) quiz1 = null;
    if (!req.body['quiz2']) quiz2 = null;
    if (!req.body['mid_sem']) mid_sem = null;
    if (!req.body['end_sem']) end_sem = null;
    if (!req.body['internal']) internal = null;

    // console.log(`Q1:${quiz1},MS:${mid_sem},Q2:${quiz2},ES:${end_sem},TM:${total_marks},cid:${cid}`);
    try {
        await pool.query('update academics set quiz1=$1,mid_sem=$2,quiz2=$3,end_sem=$4,internal=$5,total_marks=$6 where uid=$7 and cid=$8', [quiz1, mid_sem, quiz2, end_sem, internal, total_marks, req.user['uid'], cid]);
        console.log("Marks updated successfully for course: " + cid);
        res.json({ success: true });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false });
    }
};

const getAllEvents = async (req, res, currSem) => {
    try {
        const results = await pool.query('select eid,type,event_name,description,cid,issue_date,deadline,completion_date,status from events where uid=$1 and sem=$2 order by deadline asc', [req.user['uid'], currSem]);
        return results.rows;
    }
    catch (error) {
        console.log(error);
        await logger(req,'500: Internal Server Error. Redirected to home page...');
        res.redirect('/user/dashboard');
    }
};

const getEventAllowedCID = async (req, res) => {
    const { sem } = req.body;
    const uid = req.user['uid'];
    try {
        const results = await pool.query('select cid from academics where uid=$1 and sem<=$2 order by cid', [uid, sem]);
        res.json({
            success: true,
            allowedCourseID: results.rows
        });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false });
    }
};

const addEvent = async (req, res) => {
    let { event_name, type, sem, description, issue_date, deadline, completion_date, cid } = req.body;
    const uid = req.user['uid'];
    let status = 'pending';
    if (completion_date) status = 'completed';
    else completion_date = null;
    if (!cid) cid = null;
    if (!description) description = null;
    // console.log(completion_date);
    try {
        await pool.query('insert into events(uid,event_name,type,sem,description,issue_date,deadline,completion_date,cid,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [uid, event_name, type, sem, description, issue_date, deadline, completion_date, cid, status]);
        console.log("Event added successfully!");
        res.json({ success: true });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false });
    }
};

const getEventDetails = async (req, res) => {
    const { eid } = req.body;
    try {
        const results = await pool.query('select * from events where eid=$1', [eid]);
        const details = results.rows[0];

        //time conversion to local time is not done here as the js frontend 
        //script does it at the client side displaying the date. Also because
        //we are not directly using this date as the value of an input element
        //This setting of value of input element in the edit event form is done 
        //by the client side JS which then and there converts the date to suitable
        //format for displaying (local time format).

        res.json({
            success: true,
            details: details
        });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false });
    }
}

const updateEvent = async (req, res) => {
    let { eid, event_name, type, sem, description, issue_date, deadline, completion_date, cid } = req.body;
    let status = 'pending';
    if (completion_date) status = 'completed';
    else completion_date = null;
    if (!cid) cid = null;
    if (!description) description = null;
    // console.log(completion_date);
    try {
        await pool.query('update events set event_name=$1,type=$2,sem=$3,description=$4,issue_date=$5,deadline=$6,completion_date=$7,cid=$8,status=$9 where eid=$10 ', [event_name, type, sem, description, issue_date, deadline, completion_date, cid, status, eid]);
        console.log(`Event: ${eid} updated successfully!`);
        res.json({ success: true });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false });
    }
};

const deleteEvent = async (req, res) => {
    let { eid } = req.body;
    try {
        await pool.query('delete from events where eid=$1', [eid]);
        console.log("Event with ID:" + eid + " deleted successfully!");
        res.json({ success: true });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false });
    }
};

const getUserDetails= async (req,res) => {
    try{
        const results= await pool.query('select * from users where uid=$1',[req.user['uid']]);
        return results.rows[0];
    }
    catch(error) {
        console.log(error);
        await logger(req,'500: Internal Server Error. Redirected to home page...');
        res.redirect('/user/dashboard');
    }
}

const changePassword = async (req, res) => {
    const { curr_password, new_password } = req.body;
    try {
        const results = await pool.query('select password from users where uid=$1', [req.user['uid']]);
        const storedPassword = results.rows[0]['password'];
        const compareResult = await bcrypt.compare(curr_password, storedPassword);
        if (!compareResult) {
            console.log("Current password entered does not match the actual password!");
            return res.json({
                success: false,
                errors: 'Current password entered does not match the actual password!',
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
};

const changeUserDetails = async (req,res) => {
    const {name,roll_no,college,current_sem} = req.body;
    try{
        await pool.query('update users set name=$1,roll_no=$2,college=$3,current_sem=$4 where uid=$5',[name,roll_no,college,current_sem,req.user['uid']]);
        console.log("User details updated successfully for uid: "+req.user['uid']);
        return res.json({success: true});
    }
    catch(error) {
        console.log(error);
        return res.json({ success: false });
    }
}

// Main route handlers --------------------------------------

export const get_dashboard = async (req, res) => {
    let currSem = (req.session.semester) || req.user['current_sem'];
    const allSem = await getAllSem(req, res);
    if (allSem.length == 0) allSem.push(currSem);
    else if(!allSem.includes(currSem)) currSem=allSem[allSem.length-1];
    // console.log(allSem);
    const attendanceData= await getAllCoursesForAttendance(req,res,currSem);
    const allEvents= await getAllEvents(req,res,currSem);

    const upcomingEvents=[],lateEvents=[];
    for(let i=0;i<allEvents.length;i++) { //formatting dateTime so that it can be displayed
        let localISO_completion_date= null;
        if(allEvents[i].completion_date) localISO_completion_date=getLocalISODateTime(allEvents[i].completion_date);
        allEvents[i].completion_date=localISO_completion_date;
    }
    for(let i of allEvents) {
        const deadline=new Date(i.deadline),currDate=new Date();
        if(i.completion_date) ;
        else if (currDate>deadline) lateEvents.push(i);
        else upcomingEvents.push(i);
    }

    const errorMsg= req.session['errorMessage'];
    if(errorMsg) delete req.session['errorMessage'];

    const locals = {
        currSem: currSem,
        allSem: allSem,
        username: req.user['username'],
        attendance: attendanceData,
        upcomingEvents: upcomingEvents,
        lateEvents: lateEvents,
        errorMessage: errorMsg,
    };
    res.render('dashboard.ejs', locals);
}

export const post_updateSessionSem = async (req, res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/updateSessionSem : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    const { newSem } = req.body;

    // console.log(typeof(newSem));
    req.session['semester'] = newSem;
    await req.session.save();
    console.log("Session sem updated successfully!");
    res.status(200).json({ success: true });
}

export const get_courses = async (req, res) => {
    let currSem = (req.session.semester) || req.user['current_sem'];
    const allSem = await getAllSem(req, res);
    if (allSem.length == 0) allSem.push(currSem);
    else if(!allSem.includes(currSem)) currSem=allSem[allSem.length-1];
    // console.log(allSem);

    /* let courses= [
        {course_name:'DAA',cid:'IT342',professor:'AK Mishra',dept:'CSE',credits:3},
        {course_name:'COA',cid:'IT311',professor:'PQR',dept:'CSE',credits:4},
        {course_name:'NM',cid:'MA400',professor:'ABV',dept:'MA',credits:2}
    ]; */
    let courses = await getAllCourses(req, res, currSem);

    const errorMsg= req.session['errorMessage'];
    if(errorMsg) delete req.session['errorMessage'];

    const locals = {
        currSem: currSem,
        allSem: allSem,
        username: req.user['username'],
        courses: courses,
        errorMessage: errorMsg,
    };
    res.render('courses.ejs', locals);
}

export const post_courses = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/courses (post) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    // let currSem = (req.session.semester) || req.user['current_sem'];
    await addCourse(req,res);
}

export const put_courses = async (req, res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/courses (put) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    // console.log(req.body);
    // res.json({success:true});
    await updateCourse(req,res);
}

export const delete_courses = async (req, res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/courses (delete) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    // console.log(req.body);
    // res.json({ success: true });
    await deleteCourse(req,res);
}

export const get_attendance = async (req,res) => {
    let currSem = (req.session.semester) || req.user['current_sem'];
    const allSem = await getAllSem(req, res);
    if (allSem.length == 0) allSem.push(currSem);
    else if(!allSem.includes(currSem)) currSem=allSem[allSem.length-1];

    const courses= await getAllCoursesForAttendance(req,res,currSem);

    const errorMsg= req.session['errorMessage'];
    if(errorMsg) delete req.session['errorMessage'];

    const locals = {
        currSem: currSem,
        allSem: allSem,
        username: req.user['username'],
        courses: courses,
        errorMessage: errorMsg,
    };
    res.render('attendance.ejs', locals);    
}

export const post_attendance = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/attendance (post) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    await getAttendanceDetails(req,res);
}

export const post_attendanceAdd = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/attendance/add (post) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    await addAttendance(req,res);
}

export const put_attendance = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/attendance (put) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    await updateAttendance(req,res);
}

export const delete_attendance = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/attendance (delete) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    await deleteAttendance(req,res);
}

export const get_marks = async (req,res) => {
    let currSem = (req.session.semester) || req.user['current_sem'];
    const allSem = await getAllSem(req, res);
    if (allSem.length == 0) allSem.push(currSem);
    else if(!allSem.includes(currSem)) currSem=allSem[allSem.length-1];

    const allMarks= await getAllMarks(req,res,currSem);

    const errorMsg= req.session['errorMessage'];
    if(errorMsg) delete req.session['errorMessage'];

    const locals = {
        currSem: currSem,
        allSem: allSem,
        username: req.user['username'],
        marks: allMarks,
        errorMessage: errorMsg,
    };
    res.render('marks.ejs', locals);
}

export const put_marks = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/marks (put) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    await updateMarks(req,res);
}

export const get_events = async (req,res) => {
    let currSem = (req.session.semester) || req.user['current_sem'];
    const allSem = await getAllSem(req, res);
    if (allSem.length == 0) allSem.push(currSem);
    else if(!allSem.includes(currSem)) currSem=allSem[allSem.length-1];

    const allEvents=await getAllEvents(req,res,currSem);
    // console.log(allEvents);
    const upcomingEvents=[],lateEvents=[],completedEvents=[];
    for(let i=0;i<allEvents.length;i++) { //formatting dateTime so that it can be displayed
        /* const localISO_issue_date= getLocalISODateTime(allEvents[i].issue_date);
        const localISO_deadline= getLocalISODateTime(allEvents[i].deadline); */
        let localISO_completion_date= null;
        if(allEvents[i].completion_date) localISO_completion_date=getLocalISODateTime(allEvents[i].completion_date);

        /* allEvents[i].issue_date=localISO_issue_date;
        allEvents[i].deadline=localISO_deadline; */
        allEvents[i].completion_date=localISO_completion_date;
    }
    // console.log(allEvents);
    for(let i of allEvents) {
        const issue_date=new Date(i.issue_date),deadline=new Date(i.deadline),currDate=new Date();
        let completion_date=null;
        if(i.completion_date) completion_date=new Date(i.completion_date);
        if(completion_date) completedEvents.push(i);
        else if (currDate>deadline) lateEvents.push(i);
        else upcomingEvents.push(i);
    }
    /* console.log(completedEvents);
    console.log(lateEvents);
    console.log(upcomingEvents); */

    const errorMsg= req.session['errorMessage'];
    if(errorMsg) delete req.session['errorMessage'];

    const locals = {
        currSem: currSem,
        allSem: allSem,
        username: req.user['username'],
        lateEvents: lateEvents,
        upcomingEvents: upcomingEvents,
        completedEvents: completedEvents,
        errorMessage: errorMsg,
    };
    res.render('events.ejs', locals);
}

export const post_eventsGetCID = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/events/getCID (post) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    // console.log("hello");
    await getEventAllowedCID(req,res);
}

export const post_events = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/events (post) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    await addEvent(req,res);
}

export const post_eventsGetEvent = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/events/getEvent (post) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    await getEventDetails(req,res);
}

export const put_events = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/events (put) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    await updateEvent(req,res);
}

export const delete_events = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/events (delete) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    await deleteEvent(req,res);
}

export const get_profile = async (req,res) => {
    let currSem = (req.session.semester) || req.user['current_sem'];
    const allSem = await getAllSem(req, res);
    if (allSem.length == 0) allSem.push(currSem);
    else if(!allSem.includes(currSem)) currSem=allSem[allSem.length-1];

    const details=await getUserDetails(req,res);

    const errorMsg= req.session['errorMessage'];
    if(errorMsg) delete req.session['errorMessage'];

    const locals = {
        currSem: currSem,
        allSem: allSem,
        username: req.user['username'],
        details: details,
        errorMessage: errorMsg,
    };
    res.render('profile.ejs', locals);
}

export const post_changePassword = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/changePassword (post) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }
    
    await changePassword(req,res);
}

export const post_changeUserDetails = async (req,res) => {
    // Handle Validation Errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        console.log(`Validation failed in /user/changeUserDetails (post) : ${errorMessages}`);
        // await logger(req, `Validation failed: ${errorMessages}`); //because alert will be given by client side js
        return res.status(400).json({ 
            success: false,
            errors: errorMessages,
        });
    }

    await changeUserDetails(req,res);
}