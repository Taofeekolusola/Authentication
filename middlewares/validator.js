import joi from 'joi'


export const signupSchema = joi.object({
    email: joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
        tlds:{ allow:['com', 'net']},
    }),
    password: joi.string()
        .required()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*d).{8,}$')),
    role: joi.string()
         .valid('earner', 'creator')
         .required(),
});

export const loginSchema = joi.object({
    email: joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
        tlds:{ allow:['com', 'net']},
    }),
    password: joi.string()
        .required()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*d).{8,}$')),
    role: joi.string()
        .valid('earner', 'creator')
        .required(),
});

export const acceptCodeSchema = joi.object({
    email: joi.string()
        .min(6)
        .max(60)
        .required()
        .email({
            tlds: { allow: ['com', 'net'] },
        }),
    providedCode: joi.number().required(),
});

export const changePasswordSchema = joi.object({
    newPassword: joi.string()
        .required()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*d).{8,}$')),
    oldPassword: joi.string()
        .required()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*d).{8,}$')),
});

export const acceptFPCodeSchema = joi.object({
    email: joi.string()
            .min(6)
            .max(60)
            .required()
            .email({
                tlds: { allow: ['com', 'net']},
            }),
    providedCode: joi.number().required(),
    newPassword: joi.string()
           .required()
           .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*d).{8,}$')),   

});

export default signupSchema