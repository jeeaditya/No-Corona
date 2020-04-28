const postsCollection= require('../db').db().collection('posts');
const ObjectID = require('mongodb').ObjectID;
const User = require('./User');
const sanitizeHTML = require('sanitize-html');

//Class creation

let Post = function(data, userid, requestedPostId){
    this.data = data;
    this.errors = [];
    this.userid = userid;
    this.requestedPostId = requestedPostId;
}

// Function for cleanUp of incoming data

Post.prototype.cleanUp= function(){
    if( typeof(this.data.title)!="string") {this.data.title="";}
    if( typeof(this.data.body)!="string") {this.data.body="";}

    // get rid of any bogus properties
    this.data = {
        title: sanitizeHTML(this.data.title.trim(), {allowedTags: [], allowedAttributes: []}),
        body: sanitizeHTML(this.data.body.trim(), {allowedTags: [], allowedAttributes: []}),
        createdDate: new Date(),
        author: ObjectID(this.userid)
    }
}

//Function for validation of posts

Post.prototype.validate = function(){
    if(this.data.title == "") {this.errors.push("You Must Provide A title.")}
    if(this.data.body == "") {this.errors.push("You Must Provide post content.")}
}

//Function for creation of a new post

Post.prototype.create = function(){
    return new Promise((resolve, reject) =>{
        this.cleanUp();
        this.validate();
        if(!this.errors.length){
            //save post in database
            postsCollection.insertOne(this.data).then((info)=>{
                resolve(info.ops[0]._id);
            }).catch(()=>{
                this.errors.push('Please try again later.');
                reject(this.errors);
            });
            
        } else {
            reject(this.errors);
        }
    })
}


//updation check and function call

Post.prototype.update = function (){
    return new Promise(async (resolve,reject)=>{
        try{
            let post =await Post.findSingleById(this.requestedPostId, this.userid)
            if(post.isVisitorOwner){
                //actually update the db
                let status = await this.actuallyUpdate()
                resolve(status);
            } else {
                reject();
            }
        } catch {
            reject();
        }
    })
}

//Function for updation in databse

Post.prototype.actuallyUpdate = function(){
    return new Promise(async(resolve,reject)=>{
        this.cleanUp();
        this.validate();
        if(!this.errors.length){
            await postsCollection.findOneAndUpdate({_id: new ObjectID(this.requestedPostId)}, {$set: {title: this.data.title, body: this.data.body}})
            resolve("success");
        }else{
            resolve("failure");
        }
    })
}

//finding Function to be used again and again

Post.reusablePostQuery = function(uniqueOperations , visitorId){
    return new Promise(async function(resolve,reject){
        try{
            let aggOperations = uniqueOperations.concat([
                {$lookup : {from: "users", localField: "author", foreignField: "_id", as: "authorDocument"}},
                {$project: {
                    title: 1,
                    body: 1,
                    createdDate: 1,
                    authorId:  "$author",
                    author: {$arrayElemAt: ["$authorDocument", 0]}
                }}
            ])
    
            let posts =await postsCollection.aggregate(aggOperations).toArray();
    
            // Clean Up author property in each post object
            posts = posts.map(function(post){
                post.isVisitorOwner = post.authorId.equals(visitorId);
                post.authorId = undefined;
    
                post.author={
                    username: post.author.username,
                    occupation: post.author.occupation,
                    avatar: new User(post.author, true).avatar
                }
                return post;
            })
            resolve(posts);
        } catch {
            reject();
        }
    })
}


Post.findSingleById = function(id, visitorId){
    return new Promise(async function(resolve,reject){
        if( typeof(id) != "string" || !ObjectID.isValid(id)) {
            reject();
            return
        }
        let posts =  await Post.reusablePostQuery([
            {$match : {_id: new ObjectID(id)}}
        ], visitorId)
        if(posts.length){
            //console.log(posts[0]);
            resolve(posts[0])
        } else {
            reject();
        }
    })
}

Post.findByAuthorId= function(authorId) {
    return Post.reusablePostQuery([
        {$match : {author: authorId}},
        {$sort: {createdDate: -1}}
    ])
}


Post.delete = function(postIdToDelete, currentUserId){
    return new Promise(async (resolve,reject)=>{
        try{
            let post =await Post.findSingleById(postIdToDelete,currentUserId)
            if(post.isVisitorOwner){
                // visitor is the author
                await postsCollection.deleteOne({_id: new ObjectID(postIdToDelete)});
                resolve();
            } else {
                //visitor is not the author
                reject()
            }
        } catch {
            // Value not found.
            reject()
        }
    })
}

Post.search = function(searchTerm){
    return new Promise(async (resolve,reject)=>{
        if(typeof(searchTerm) == "string"){
            let posts =await Post.reusablePostQuery([
                {$match : {$text: {$search: searchTerm}}},
                {$sort: {score: {$meta: "textScore"}}}
            ]);
            resolve(posts);
        } else {
            reject();
        }
    })
}

Post.countPostByAuthor = function(id){
    return new Promise( async (resolve,reject)=>{
        try {
            let postCount = await postsCollection.countDocuments({author: (id)})
            resolve(postCount);
        } catch {
            reject();
        }
    })
}

Post.getFeed = async function(followedUsers) {
    //Look for the post where the author is in above array.
    
        return await Post.reusablePostQuery([
            {$match: {author: {$in: followedUsers}}},
            {$sort: {createdDate: -1}}
        ])
    
}

module.exports= Post;