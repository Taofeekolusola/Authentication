import mongoose from 'mongoose'

import { timeStamp } from "console";
import { model } from "mongoose";
import { verifyVerificationCode } from '../controllers/authController.js';

const userSchema = mongoose.Schema({
    email:{
        type: String,
        required: [true, 'Email is required!'],
        trim: true,
        unique: [true, 'Email must be unique!'],
        minLength: [5, 'Email must have 5 characters!']
    },
    password:{
        type: String,
        required: [true, 'Password must be provided!'],
        trim: true,
        select: false,
    },
    role: {
        type: String,
        enum: ['earner', 'creator'],
        required: [true, 'Role is required!'],
    },
    verified: {
        type: Boolean,
        default: false,
    },
    verificationCode: {
        type: String,
        select: false,
    },
    verificationCodeValidation: {
        type: Date,
        required: true,
    },
    forgotPasswordCode: {
        type: String,
        select: false,
    },
    forgotPasswordCodeValidation: {
        type: Number,
        select: false,
    },
},{
    timestamps:true
});

export default mongoose.model('User', userSchema)