import jwt from 'jsonwebtoken';
import signupSchema from '../middlewares/validator.js';
import { loginSchema } from '../middlewares/validator.js';
import { acceptCodeSchema } from '../middlewares/validator.js';
import { changePasswordSchema } from '../middlewares/validator.js';
import User from "../models/users.model.js"
import {doHash, doHashValidation, hmacProcess} from "../utils/hashing.js"
import transport from '../middlewares/sendMail.js'
import crypto from "crypto";

const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const signup = async (req, res) => {
    const {email,password, role} = req.body;
    try {
         const {error, value} = signupSchema.validate({email, password, role});

         if(error){
            return res.status(401).json({success:false, message:error.details[0].message})
         }

         // Ensure role is either "earner" or "creator"
         if (role !== "earner" && role !== "creator"){
            return res.status(400).json({
               success: false, message: "Invalid role specified!"
            });
         }

         // check if user already exists
         const existingUser = await User.findOne({email});
         if(existingUser){
            return res.status(401).json({success:false, message:'User already exists!'})
         }
        
         const hashedPassword = await doHash(password, 12)

         // Generate verification code
         const verificationCode = generateVerificationCode();
         const hashedCode = crypto.createHmac('sha256', process.env.HMAC_VERIFICATION_CODE_SECRET)
                                  .update(verificationCode)
                                  .digest("hex");

         const verificationCodeValidation = Date.now()

         const newUser = new User({
            email,
            password:hashedPassword,
            role,
            verified: false,
            verificationCode: hashedCode,
            verificationCodeValidation: verificationCodeValidation,
         });

         const result = await newUser.save();
         result.password = undefined;

         console.log(`Verification Code for ${email}: ${verificationCode}`)
         
         res.status(201).json({
            success:true, message:"Your account has been created successfully", 
            role:result.role,
            result,
         })
    } catch (error) {
        console.log(error)
    }
};

export const login = async (req, res) => {
   const {email, password, role} = req.body;
   try {
        const {error, value} = loginSchema.validate({email, password, role});
        if (error){
            return res
                   .status(401)
                   .json({ success: false, message: error.details[0].message});
        }

        const existingUser = await User.findOne({email}).select('+password role')
        if(!existingUser){
            return res
                .status(401)
                .json({ success: false, message: "User does not exists!"});
         }

         if(existingUser.role !== role) {
            return res.status(403).json({
               success: false, message:'Invalid role for this user!'
            });
         }

         const result = await doHashValidation(password,existingUser.password)
         if(!result){
            return res
            .status(401)
            .json({ success: false, message: "Invalid credentials!"});
         }

         const token = jwt.sign({
            userId: existingUser._id,
            email: existingUser.email,
            role: existingUser.role,
            verified: existingUser.verified,
         }, 
         process.env.TOKEN_SECRET,
         {
            expiresIn: '8h',
         }
      );

      res.cookie('Authorization', 'Bearer ' + token, {expires: new Date(Date.now()  + 8
          * 3600000), httpOnly: process.env.NODE_ENV === 'production' ,  
                      secure: process.env.NODE_ENV === 'production'
                  })
                  .json({
                     success: true,
                     token,
                     role: existingUser.role,
                     message: 'logged in successfully',
                  });

   } catch (error) {
      console.log(error);
   }
};


export const logout = async (req, res) => {
   res.clearCookie('Authorization')
   .status(200).json({ success:true, message:'logged out successfully' });
};

export const sendVerificationCode = async (req, res) => {
   const {email} = req.body;
   try {
      const existingUser = await User.findOne({email})
      if (!existingUser) {
         return res 
            .status(404)
            .json({ success: false, message: 'User does not exists!'});
      }
      if(existingUser.verified){
         return res
             .status(200)
             .json({ success: false, message: 'You are already verified!'})
      }

      const codeValue = Math.floor(Math.random() * 1000000).toString();
      let info =await transport.sendMail({
         from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
         to: existingUser.email,
         subject:"verification  code",
         html: '<h1>' + codeValue + '</h1>'
      })

      if(info.accepted[0] === existingUser.email){
          const  hashedCodeValue = hmacProcess(codeValue, process.env.HMAC_VERIFICATION_CODE_SECRET)
          existingUser.verificationCode = hashedCodeValue;
          existingUser.verificationCodeValidation = Date.now();
          await existingUser.save()
          return res.status(200).json({ success: true, message: 'Code sent!'})
      }
      res.status(400).json({ success: false, message: 'Code sent failed!'});
   }catch (error){
      console.log(error);
   }
}

export const verifyVerificationCode = async (req, res) => {
   const{email, providedCode} = req.body;
   try{
      console.log("Received Request for verification:",{ email, providedCode });
      const {error, value} = acceptCodeSchema.validate({email, providedCode});
      if (error) {
         console.log("Validation Error:", error.details[0].message);
         return res
             .status(401)
             .json({ success: false, message: error.details[0].message });
      }
      
      const codeValue = providedCode.toString();
      const existingUser = await User.findOne({ email}).select('+verificationCode +verificationCodeValidation');

      if(!existingUser) {
         console.log("User Not Found:", email);
         return res
              .status(401)
              .json({ success: false, message: "User does not exists!"});
      }

      console.log("Existing User Data:", existingUser);
      if(existingUser.verified){
         console.log("User Already Verified:", email);
           return res.status(400).json({ success: false, message: "You are already verified!"});
      }
      
      if(!existingUser.verificationCode || !existingUser.verificationCodeValidation){
         console.log("Missing Verification Code Data:",{
            verificationCode: existingUser.verificationCode, verificationCodeValidation: existingUser.verificationCodeValidation
         });
         return res.status(400).json({ success: false, message: "Something is wrong with the code!"});
      }

      if(Date.now() - existingUser.verificationCodeValidation > 5 * 60 * 1000){
         console.log("Verification Code Expired:", {
            codeValidationTime: existingUser.verificationCodeValidation, currentTime: Date.now(),
         });
         return res.status(400).json({ success: false, message: "Code has expired!"});
      }
      
      const hashedCodeValue = hmacProcess(codeValue, process.env.HMAC_VERIFICATION_CODE_SECRET);

      console.log("Hashed Provided Code:", hashedCodeValue);
      console.log("Stored Verification Code:", existingUser.verificationCode);

      if(hashedCodeValue === existingUser.verificationCode){
         existingUser.verified = true;
         existingUser.verificationCodeValidation = Date.now();
         await existingUser.save();
         console.log(`New Verication Code Sent:${verificationCode}`);
         return res
         .status(200)
         .json({ success: true, message: 'Verification code has been resent succesfully.',})
      }

      console.log("verification code mismatch");
      return res.status(400).json({ success: false, message: "Unexpected occurred!"});

   } catch (error) {
      console.log("Error in verifyVerificationCode:", error);
      return res
         .status(500)
         .json({ success: false, message: 'Internal Server Error'});
   }
};

export const changePassword = async (req, res) => {
   const {userId, verified} = req.user;
   const {oldPassword, newPassword } = req.body;
   try {
       const { error, value} = changePasswordSchema.validate({oldPassword, newPassword });
       if (error) {
         return res
         .status(401)
         .json({ success: false, message: error.details[0].message });
      }
      if(!verified){
         return res
            .status(401)
            .json({ success: false, message: 'You are a verified user!'});
      }
      const existingUser = await User.findOne({_id:userId}).select('+password');
      if(!existingUser){
         return res
             .status(401)
             .json({ success: false, messenger: 'user does not exists!'});
      }
      const result = await doHashValidation(oldPassword, existingUser.password)
      if (!result) {
         return res
             .status(401)
             .json({ success: false, message: "Invalid credentials!" });
      }
      const hashedPassword = await doHash(newPassword, 12);
      existingUser.password = hashedPassword;
      await existingUser.save();
      return res
             .status(200)
             .json({ success: true, message: "Password updated!" });
   } catch (error) {
      console.log(error);
   }
};

export const sendForgotPasswordCode = async (req, res) => {
   const {email} = req.body;
   try {
      const existingUser = await User.findOne({email})
      if (!existingUser) {
         return res 
            .status(404)
            .json({ success: false, message: 'User does not exists!'});
      }

      const codeValue = Math.floor(Math.random() * 1000000).toString();
      let info =await transport.sendMail({
         from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
         to: existingUser.email,
         subject:"Forgot password code",
         html: '<h1>' + codeValue + '</h1>'
      })

      if(info.accepted[0] === existingUser.email){
          const  hashedCodeValue = hmacProcess(codeValue, process,env.HMAC_VERIFICATION_CODE_SECRET)
          existingUser.forgotPasswordCode = hashedCodeValue;
          existingUser.forgotPasswordCodeValidation = Date.now();
          await existingUser.save()
          return res.status(200).json({ success: true, message: 'Code sent!'})
      }
      res.status(400).json({ success: false, message: 'Code sent failed!'});
   }catch (error){
      console.log(error);
   }
}

export const verifyForgotPasswordCode = async (req, res) => {
   const{email, providedCode, newPassword} = req.body;
   try{
      const {error, value} = acceptCodeSchema.validate({email, providedCode});
      if (error) {
         return res
             .status(401)
             .json({ success: false, message: error.details[0].message });
      }
      
      const codeValue = providedCode.toString();
      const existingUser = await User.findOne({ email}).select("+verificationCode +verificationCodeValidation");

      if(!existingUser) {
         return res
              .status(401)
              .json({ success: false, message: "User does not exists!"});
      }
      if(existingUser.verified){
           return res.status(400).json({ success: false, message: "You are already verified!"});
      }
      
      if(!existingUser.verificationCode || !existingUser.verificationCodeValidation){
         return res.status(400).json({ success: false, message: "Something is wrong with the code!"});
      }

      if(Date.now() - existingUser.verificationCodeValidation > 5 * 60 * 1000){
         return res.status(400).json({ success: false, message: "Code has expired!"});
      }
      
      const hashedCodeValue = hmacProcess(codeValue, process.env.HMAC_VERIFICATION_CODE_SECRET)

      if(hashedCodeValue === existingUser.verificationCode){
         existingUser.verified = true;
         existingUser.verificationCodeValidation = undefined;
         await existingUser.save()
         return res
         .status(200)
         .json({ success: false, message: 'Your account has been verified!'})
      }
      return res.status(400).json({ success: false, message: "Unexpected occurred!"});

   } catch (error) {
      console.log(error);
   }
};