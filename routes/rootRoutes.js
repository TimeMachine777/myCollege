import express from "express";
const router=express.Router();

import {} from "../controllers/rootController.js";

router.get('/',(req,res) => {
    const errorMsg= req.session['errorMessage'];
    if(errorMsg) delete req.session['errorMessage'];
    const locals={
        isAuthenticated: req.isAuthenticated(),
        page: 'Home',
        errorMessage: errorMsg,
    };
    res.render('home.ejs',locals);
});

router.get('/aboutUs', (req,res) => {
    const errorMsg= req.session['errorMessage'];
    if(errorMsg) delete req.session['errorMessage'];
    const locals={
        isAuthenticated: req.isAuthenticated(),
        page: 'About Us',
        errorMessage: errorMsg,
    };
    res.render('aboutUs.ejs',locals);
});


export default router;