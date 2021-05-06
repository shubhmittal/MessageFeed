const jwt=require('jsonwebtoken');

module.exports=(req,res,next)=>{
    const authHeader=req.get('Authorization');
    if(!authHeader)
    {
        const error=new Error('not authenticated');
        error.statusCode=401;
        throw error;
    }
    //extract token from incomming requests
    //getting token from the header from react feed.js

    const token=authHeader.split(' ')[1];
    let decodedToken;
    try{
        decodedToken=jwt.verify(token,'somesupersecretsecret');
    }
    catch(err)
    {
        err.statusCode=500;
        throw(err);
    }
    if(!decodedToken)   //unable to verify token
    {
        const error=new Error('not authenticated !!!');
        error.statusCode=401;
        throw error;
    }
    req.userId=decodedToken.userId;//in token we have userId and email stored
    next();
};