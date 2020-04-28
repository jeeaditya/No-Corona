const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const jwt = require('jsonwebtoken');

exports.apiGetPostsByUsername = async function(req,res){
    try{
        let authorDoc = await User.findByUsername(req.params.username)
        let posts = await Post.findByAuthorId(authorDoc._id)
        res.json(posts);
    } catch {
        res.json("Sorry No user found with that name")
    }
}

exports.doesUsernameExist = function(req,res){
    User.findByUsername(req.body.username).then(()=>{
        res.json(true)
    }).catch(()=>{
        res.json(false)
    })
}

exports.doesEmailExist = async function(req,res){
    let emailBool = await User.doesEmailExist(req.body.email)
    res.json(emailBool)
}

exports.sharedProfileData =async function(req,res,next) {
    let isVisitorsProfile = false;
    
    let isFollowing = false ;
    if(req.session.user){
        isVisitorsProfile = req.profileUser._id.equals(req.session.user._id);
        isFollowing = await Follow.isVisitorFollowing( req.profileUser._id, req.visitorId)
    }
    req.isVisitorsProfile = isVisitorsProfile;
    req.isFollowing = isFollowing;
    //retrieve counts of posts, following, followers
    let postCountPromise = Post.countPostByAuthor(req.profileUser._id)
    let followersCountPromise = Follow.countFollowersByAuthor(req.profileUser._id);
    let followingCountPromise = Follow.countFollowingByAuthor(req.profileUser._id);
    let [postCount, followersCount, followingCount] = await Promise.all([postCountPromise, followersCountPromise, followingCountPromise])
    
    req.postCount = postCount;
    req.followersCount = followersCount;
    req.followingCount = followingCount;

    next()
}

exports.mustBeLoggedIn = function(req, res, next) {
    if( req.session.user){
        next();
    } else {
        req.flash("errors","Please Login First");
        req.session.save(function(){
            res.redirect("/");
        })
    }
}

exports.apiMustBeLoggedIn = function(req,res,next){
    try{
        req.apiUser = jwt.verify(req.body.token,process.env.JWTSECRET)
        next()
    } catch {
        res.json("Sorry You must provide a valid token.")
    }
}

exports.login= function(req,res){
    let user = new User(req.body);
    user.login().then(function(result){
        
        req.session.user = {
            username: user.data.username,
            avatar: user.avatar,
            _id: user.data._id,
            occupation: user.data.occupation
        };
        req.session.save(function(){  
            res.redirect('/'); /// no render because that page will decide the rendering
        })
    }).catch(function(e){
        req.flash('errors', e)
        req.session.save(function(){
            res.redirect('/');
        })
    });
    
}

exports.apiLogin= function(req,res){
    let user = new User(req.body);
    user.login().then(function(result){
        res.json(jwt.sign({_id: user.data._id}, process.env.JWTSECRET, {expiresIn: '30m'}))
    }).catch(function(e){
        res.json("Sorry invalid username and password.")
    })
    
}

exports.logout= function(req,res){
    req.session.destroy(function(){
        res.redirect('/'); /// no render because that page will decide the rendering
    });
}

exports.register= function(req,res){
    let user= new User(req.body);
    user.register().then(()=>{

        req.session.user= {username :user.data.username, avatar: user.avatar, _id: user.data._id, occupation: user.data.occupation};
        req.session.save(function(){
            Follow.createPrimaryFollows(req.session.user._id).then(()=>{
                res.redirect('/');
            }).catch(()=>{
                req.session.save(function(){
                    res.redirect('/');
                })
            })
        })
    }).catch((regErrors)=>{
        regErrors.forEach(function(regError){
            req.flash('regErrors', regError);
        })
        req.session.save(function(){
            res.redirect('/');
        })
    })  
}

exports.home = async function(req,res){
    if(req.session.user){
        try {
            // fetch the following of the current user
            let followedUsers = await Follow.findFollowingIds(req.session.user._id)
            // fetch feed of posts for current user
            let posts = await Post.getFeed(followedUsers)
            res.render('home-dashboard',{posts: posts})
        } catch {
            res.render('404');
        }
    } else {
        res.render('home-guest', {regErrors: req.flash('regErrors')});
    }
}

exports.ifUserExists = function(req,res,next) {
    User.findByUsername(req.params.username).then(function(userDocument){
        req.profileUser = userDocument;
        next();
    }).catch(function(){
        res.render('404');
    })
}

exports.profilePostsScreen = function(req,res){
    //ask our post Model for posts by a certain author id
    Post.findByAuthorId(req.profileUser._id).then(function(postsArray){

        res.render('profile',{
            title : `${req.profileUser.username}'s Profile`,
            currentPage: "posts",
            posts: postsArray,
            profileUsername: req.profileUser.username,
            profileOccupation: req.profileUser.occupation,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: {postCount: req.postCount, followersCount: req.followersCount, followingCount: req.followingCount}
        });
    }).catch(function(){
        res.render('404');
    })
}

exports.profileFollowersScreen =async function (req,res){
    try {
        let followers =await Follow.getFollowersById(req.profileUser._id)
        res.render('profile-followers',{
            currentPage: "followers",
            followers: followers,
            profileUsername: req.profileUser.username,
            profileOccupation: req.profileUser.occupation,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: {postCount: req.postCount, followersCount: req.followersCount, followingCount: req.followingCount}
        })
    } catch {
        res.render('404');
    }
}

exports.profileFollowingScreen =async function (req,res){
    try {
        let following =await Follow.getFollowingById(req.profileUser._id)
        res.render('profile-following',{
            currentPage: "following",
            following: following,
            profileUsername: req.profileUser.username,
            profileOccupation: req.profileUser.occupation,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: {postCount: req.postCount, followersCount: req.followersCount, followingCount: req.followingCount}
        })
    } catch {
        res.render('404');
    }
}