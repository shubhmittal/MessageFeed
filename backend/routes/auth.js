const express = require('express');

const { body }=require('express-validator/check');

const authController = require('../controllers/auth');

const User=require('../models/user');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.put('/signup',[
    body('email')
    .isEmail()
    .withMessage('enter a valid email')
    .custom((val,{req})=>{
        return User.findOne({email:val}).then(userDoc=>{
            if(userDoc){
                return Promise.reject('E-mail exist already please choose another one !!');
            }
        })
    })
    .normalizeEmail(),
    body('password')
    .trim()
    .isLength({min:5}),
    body('name').trim().not().isEmpty()
],
authController.signup
);

router.post('/login',authController.login);

router.get('/status', isAuth, authController.getUserStatus);

router.patch(
  '/status',
  isAuth,
  [
    body('status')
      .trim()
      .not()
      .isEmpty()
  ],
  authController.updateUserStatus
);


module.exports = router;