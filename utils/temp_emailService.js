import nodemailer from 'nodemailer';
import env from "dotenv";

env.config();

/* const transporter = nodemailer.createTransport({ //testing account
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    }
}); */

const transporter = nodemailer.createTransport({
    host: "in-v3.mailjet.com",
    port: 465,
    secure: true, // upgrade later with STARTTLS
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    },
});

/* const info = await transporter.sendMail({
    from: '"myCollege Web App" <gaurangdev777@gmail.com>', // sender address
    to: "abc@mail.com", // list of receivers
    subject: "OTP Testing myCollege ✔", // Subject line
    text: "The OTP is: 9875", // plain text body
    html: "The OTP is: 9875", // html body
}); */

export const sendEmail = async (options) => {
    try {
        const info = await transporter.sendMail(options);
        if (info.rejected.length > 0) {
            return { status: false };
        }
        return { status: true };
    }
    catch (error) {
        // console.log(error);
        return { status: false, error: error };
    }
};

// console.log(info);