export const logger = async function (req, errorMsg) {
    req.session['errorMessage'] = errorMsg;
    await req.session.save();
    console.log("Session updated after storing errorMessage.");
}