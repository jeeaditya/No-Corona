const express=require('express');
const session= require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');
const markdown = require('marked');
const sanitizeHTML = require('sanitize-html');
const csrf = require('csurf')
const app= express();
const fetch = require('node-fetch')
const axios = require('axios')

// Api request sent through axios
app.use( async (req,res,next) => {
    cases = {};
    await axios.get("https://api.covid19india.org/data.json")
      .then((response) => {
        return response.data;
      })
      .then((data) => {
        data_array = data.statewise;
        total_obj = data_array.filter((data) => data.state === "Total")[0];
  
        cases.total_cases = total_obj.confirmed;
        cases.new_cases = total_obj.deltaconfirmed;
        cases.death_total = total_obj.deaths;
        cases.death_new = total_obj.deltadeaths;
        cases.active = total_obj.active;
        cases.recovered_new = total_obj.deltarecovered;
        cases.recovered_total = total_obj.recovered;
        cases.updated = total_obj.lastupdatedtime;
      })
      .then(()=>{
        res.locals.cases = cases;
        next()
      });
    
  })

  /*
  //  API request sent through node-fetch 
  app.use( async (req,res,next) => {
    cases = {};
    await fetch("https://api.covid19india.org/data.json")
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        data_array = data.statewise;
        total_obj = data_array.filter((data) => data.state === "Total")[0];
  
        cases.total_cases = total_obj.confirmed;
        cases.new_cases = total_obj.deltaconfirmed;
        cases.death_total = total_obj.deaths;
        cases.death_new = total_obj.deltadeaths;
        cases.active = total_obj.active;
        cases.recovered_new = total_obj.deltarecovered;
        cases.recovered_total = total_obj.recovered;
        cases.updated = total_obj.lastupdatedtime;
      })
      .then(()=>{
        res.locals.cases = cases;
        next()
      });
    
  })
  */
app.use(express.urlencoded({extended: false}));
app.use(express.json());

//api router
app.use('/api', require('./router-api'))



let sessionOptions = session({
    secret: "Adi is the cool stud here.",
    store: new MongoStore({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true
    }
})



app.use(sessionOptions);
app.use(flash());


app.use(function (req,res,next){
    //Make our marked down function available within ejs templates
    res.locals.filterUserHTML= function(content){
        return markdown(content);
    }

    //Make current user id available on the req object
    if(req.session.user) {req.visitorId = req.session.user._id}
    else {req.visitorId = 0}

    //Make all errors and success messages available to all templates
    res.locals.errors = req.flash("errors");
    res.locals.success = req.flash("success");

    //MAke user session data from within view templates
    res.locals.user= req.session.user;

    next();
})



const router= require('./router');

app.use(express.static('public'));

app.use(csrf())

app.use(function(req,res,next){
    res.locals.csrfToken = req.csrfToken()
    next()
})

app.use('/',router)

app.set('views','views');
app.set('view engine', 'ejs');

app.use(function(err, req, res, next){
    if(err){
        if(err.code == "EBADCSRFTOKEN"){
            req.flash("errors","Cross Site Request Forgery Detected.")
            req.session.save(()=> res.redirect('/'))
        } else {
            res.render('404')
        }
    }
})

const server = require('http').createServer(app)
const io = require('socket.io')(server)

io.use(function(socket, next){
    sessionOptions(socket.request, socket.request.res, next)
})

io.on('connection',function(socket){
    if(socket.request.session.user){
        let user = socket.request.session.user
        
        socket.emit('welcome', {username: user.username,avatar: user.avatar,occupation: user.occupation })

        socket.on('chatMessageFromBrowser', function(data){
            socket.broadcast.emit('chatMessageFromServer', {message: sanitizeHTML(data.message, {allowedTags: [], allowedAttributes: {}}), username: user.username, avatar: user.avatar,occupation: user.occupation})
        })
    }
})






module.exports = server