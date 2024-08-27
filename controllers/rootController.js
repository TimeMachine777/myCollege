export const get_root = (req, res) => {
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        isAuthenticated: req.isAuthenticated(),
        page: 'Home',
        errorMessage: errorMsg,
    };
    res.render('home.ejs', locals);
}

export const get_aboutUs = (req, res) => {
    const errorMsg = req.session['errorMessage'];
    if (errorMsg) delete req.session['errorMessage'];
    const locals = {
        isAuthenticated: req.isAuthenticated(),
        page: 'About Us',
        errorMessage: errorMsg,
    };
    res.render('aboutUs.ejs', locals);
}