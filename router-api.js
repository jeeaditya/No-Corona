const apiRouter = require('express').Router()
const cors = require('cors')
const userController= require('./controllers/userController')
const postController= require('./controllers/postController');
const followController=require('./controllers/followController');

apiRouter.use(cors())


apiRouter.post('/login', userController.apiLogin)
apiRouter.post('/create-post', userController.apiMustBeLoggedIn,postController.apiCreate)
apiRouter.delete('/post/:id', userController.apiMustBeLoggedIn, postController.apiDelete)
apiRouter.get('/postsByAuthor/:username', userController.apiGetPostsByUsername)

module.exports = apiRouter