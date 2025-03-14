import express from "express";
import { signup, verifyForgotPasswordCode }  from '../controllers/authController.js'
import { login }  from '../controllers/authController.js'
import { logout }  from '../controllers/authController.js'
import { sendVerificationCode }  from '../controllers/authController.js'
import { verifyVerificationCode }  from '../controllers/authController.js'
import { identifier } from "../middlewares/identification.js"
import { changePassword }  from '../controllers/authController.js'



const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', identifier, logout);
router.patch('/send-verification-code', identifier, sendVerificationCode);
router.patch('/verify-verification-code', identifier, verifyVerificationCode);
router.patch('/change-password', identifier, changePassword);
router.patch('/verify-forgot-password-code', verifyForgotPasswordCode);


export default router