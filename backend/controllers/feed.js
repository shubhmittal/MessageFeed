const fs = require('fs');
const path = require('path');

const { validationResult }=require('express-validator/check');
const io=require('../socket');

const Post=require('../models/post');
const User=require('../models/user');

// exports.getPosts = (req, res, next) => {
//   res.status(200).json({   //convert the content into json format
//     posts: [
//       { 
//         //these are the values that will be passed in the react
//         _id: '1',
//         title: 'First Post', 
//         content: 'This is the first post!',
//         imageUrl: 'images/tiger.jpg',
//         creator: {
//           name: 'Shubham'
//         },
//         createdAt: new Date() 
//       }
//     ]
//   });
// };


//without pagination
// exports.getPosts = (req, res, next) => {
//   Post.find()
//   .then(posts=>{
//     res.status(200).json({message:'fetched post successfully !!',posts:posts});
//   })
//   .catch(err=>{
//     if(!err.statusCode){
//       err.statusCode=500;
//     }
//     next(err);
//   });
// };


//Adding pagination
exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  Post.find()
    .countDocuments()
    .then(count => {
      totalItems = count;
      return Post.find()
        .populate('creator')
        .sort({createdAt:-1})
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then(posts => {
      res
        .status(200)
        .json({
          message: 'Fetched posts successfully.',
          posts: posts,
          totalItems: totalItems
        });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};




exports.createPost = (req, res, next) => {
  const errors=validationResult(req);
  if(!errors.isEmpty()){
    const error=new Error('enter proper data');
    error.statusCode=422;
    throw error;
    // return res.status(422)
    //   .json({
    //     message:'enter proper data',
    //     errors:errors.array()
    //   });
  }
  if(!req.file){
    const error=new Error('no images provided');
    error.statusCode=422;
    throw error;
  }
  const imageUrl = req.file.path.replace("\\" ,"/");
  const title = req.body.title;
  const content = req.body.content;
  let creator;
  // Create post in db

  //in browser we have to set content type as application/json ,,but in express.js i.e. at server point it did it
  // automaticallywith the help of .json


  
  const post=new Post({
    title: title, 
    content: content,
    // creator:{
    //   name:'Shubham'
    // },
    creator:req.userId, //from middleware---->is-auth.js
    imageUrl:imageUrl
  });
  post.save()
  .then(result=>{
    console.log(result);
     return User.findById(req.userId);
  })
  .then(user=>{
    creator=user;  
    user.posts.push(post);
    return user.save(); 
  })
  .then(result=>{ //emit will send message to all the connected users
    io.getIO().emit('posts',{action:'create',post:{...post._doc,creator:{_id:req.userId,name:creator.name}}}); //post that is created is stored in post key
    //posts--->evevt name
    res.status(201).json({
      message: 'Post created successfully!',
      post: post,
      creator:{
        _id:creator._id,
        name:creator.name
      }
    });
  })
  .catch(err=>{
    console.log(err);
    if(!err.statusCode){
      err.statusCode=500;
    }
    next(err);
  });
  
};


//for fetching a single post
exports.getPost=(req,res,next)=>{
  const postId=req.params.postId;
  Post.findById(postId)
  .then(post=>{
    if(!post)
    {
      const error=new Error('Could find post!!');
      error.statusCode=404;
      throw error;  //it will go into catch block and executes the catch block
    }
    res.status(200).json({message:'post fetched !!',post:post});
  })
  .catch(err=>{
    if(!err.statusCode){
      err.statusCode=500;
    }
    next(err);
});
};

exports.updatePost = (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;  //if no new file is picked
  if (req.file) {  //if we pick new file
    imageUrl = req.file.path.replace("\\" ,"/"); 
  }
  if (!imageUrl) {
    const error = new Error('No image file picked.');
    error.statusCode = 422;
    throw error;
  }
  Post.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      if(post.creator.toString()!==req.userId){
        const err=new Error('not authorized');
        err.statusCode=403;
        throw err;
      }
      if (imageUrl !== post.imageUrl) {  //if old and new images are not same
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;
      return post.save();
    })
    .then(result => {
      res.status(200).json({ message: 'Post updated!', post: result });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deletePost=(req,res,next)=>{
  const postId=req.params.postId;
  Post.findById(postId)
  .then(post=>{
    //check whether the user is logged in or not
    if(!post){
        const err=new Error('post not found');
        err.statusCode=404;
        throw err; 
    }
    if(post.creator.toString()!==req.userId){
      const err=new Error('not authorized');
      err.statusCode=403;
      throw err;
    }
    clearImage(post.imageUrl);
    return Post.findByIdAndRemove(postId);
  })
  .then(result=>{
    return User.findById(req.userId);
    
  })
  .then(user=>{
    user.posts.pull(postId);  
    return user.save();
    
  })
  .then(result=>{
    console.log(result);
    res.status(200).json({ message: 'Post Deleted!!', post: result });
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });
};

const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.log(err));
};
