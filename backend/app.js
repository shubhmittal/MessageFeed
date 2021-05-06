const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path=require('path');
const multer=require('multer');
//const { v4: uuidv4 } = require('uuid');
const { uuid } = require('uuidv4');

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');

const app = express();
 
const fileStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'images');
    },
    filename: function(req, file, cb) 
    {
        cb(null, uuid()+file.originalname);
    }
  });

const fileFilter=(req,file,cb)=>{
  if(
    file.mimetype==='image/png' ||
    file.mimetype==='image/jpg' ||
    file.mimetype==='image/jpeg' 
  ){
    cb(null,true);
  }else{
    cb(null,false);
  }
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>  i.e. it for "form" post request,etc
app.use(bodyParser.json()); // application/json     to deal with json data
app.use(
  multer({storage:fileStorage,fileFilter:fileFilter}).single('image')
);
app.use('/images',express.static(path.join(__dirname,'images')));  //serving images folser statically for the path starting with /images

app.use((req,res,next)=>{
    res.setHeader('Access-Control-Allow-Origin','*'); //allow access from any place
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,PATCH');
    res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
    next();
});

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use((error,req,res,next)=>{
    console.log(error);
    const status=error.statusCode || 500;
    const message=error.message;
    const data=error.data;
    res.status(status).json({
        message:message,
        data:data
    });
});

mongoose
  .connect(
    '...............MONGOOSE_URL.................'
  )
  .then(result => {
    const server =app.listen(8080);
    const io=require('./socket').init(server);
    io.on('connection',socket=>{  //connection between user and client eachtime the client is connected
      console.log('socket connected');
    });
  })
  .catch(err => console.log(err));
