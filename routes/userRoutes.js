import express from "express";
import { body, validationResult } from "express-validator";
const router = express.Router();

import { getAllSem, getAllCourses,addCourse, updateCourse, deleteCourse,getAllCoursesForAttendance,getAttendanceDetails, addAttendance,updateAttendance,deleteAttendance, getAllMarks, updateMarks, getAllEvents, getEventAllowedCID, addEvent, getEventDetails, getLocalISODateTime, updateEvent, deleteEvent, getUserDetails, changePassword, changeUserDetails } from "../controllers/userController.js";
import { validateNewSem, validateCourseName, validateCID, validateProfessor, validateDept, validateCredits, validateSem, validatePrevCID, validateCourseDate, validateStatus, validatePrevStatus, validateAID, validateQuiz1, validateQuiz2, validateMidSem, validateEndSem, validateInternal, validateEventName, validateEventType, validateDescription, validateIssueDate, validateDeadline, validateCompletionDate, validateEventCID, validateEID, validateCurrPassword, validateChangeNewPassword, validateChangeRepeatNewPassword } from "../validators/userValidator.js";
import { validateName, validateRollNo, validateCollegeName, validateCurrSem } from "../validators/authValidator.js";

router.get('/dashboard', async (req, res) => {
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
});

router.post('/updateSessionSem', [validateNewSem], async (req, res) => {
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
});

router.get('/courses', async (req, res) => {
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
});

router.post('/courses', [validateCourseName, validateCID, validateProfessor, validateDept, validateCredits, validateSem], async (req,res) => {
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
})

router.put('/courses', [validateCourseName, validateCID, validateProfessor, validateDept, validateCredits, validateSem, validatePrevCID], async (req, res) => {
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
});

router.delete('/courses', [validateCID], async (req, res) => {
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
});

router.get('/attendance', async (req,res) => {
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
});

router.post('/attendance', [validateCID], async (req,res) => {
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
});

router.post('/attendance/add', [validateCID, validateCourseDate, validateStatus], async (req,res) => {
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
});

router.put('/attendance', [validateAID,validateCID, validateCourseDate, validateStatus, validatePrevStatus], async (req,res) => {
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
});

router.delete('/attendance', [validateAID, validateCID, validatePrevStatus], async (req,res) => {
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
});

router.get('/marks', async (req,res) => {
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
});

router.put('/marks', [validateCID, validateQuiz1, validateMidSem, validateQuiz2, validateEndSem, validateInternal], async (req,res) => {
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
});

router.get('/events', async (req,res) => {
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
});

router.post('/events/getCID', [validateSem], async (req,res) => {
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
});

router.post('/events', [validateEventName, validateEventType, validateSem,validateDescription,validateIssueDate, validateDeadline, validateCompletionDate,validateEventCID], async (req,res) => {
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
});


router.post('/events/getEvent', [validateEID], async (req,res) => {
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
});

router.put('/events', [validateEID, validateEventName, validateEventType, validateSem, validateDescription, validateIssueDate, validateDeadline, validateCompletionDate, validateEventCID], async (req,res) => {
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
});

router.delete('/events', [validateEID], async (req,res) => {
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
});

router.get('/profile', async (req,res) => {
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
});

router.post('/changePassword', [validateCurrPassword, validateChangeRepeatNewPassword, validateChangeNewPassword], async (req,res) => {
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
});

router.post('/changeUserDetails', [validateName, validateRollNo, validateCollegeName, validateCurrSem], async (req,res) => {
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
});

export default router;
