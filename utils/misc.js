import jwt from "jsonwebtoken";

export const generateJWTToken = (payload, expiresIn) => {
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiresIn });
    return jwtToken;
}

export const generateOTP = () => {
    let val = '';
    for (let i = 0; i < 4; i++) {
        let a1 = Math.floor(Math.random() * 10);
        val += a1.toString();
    }
    return val;
}