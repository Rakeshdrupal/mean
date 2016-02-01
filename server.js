/* global process */
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var User = require('./app/models/user');
var superSecret = 'ilovescotchscotchyscotchscotch';
var port = process.env.PORT || 8080;

// APP CONFIGURATION ---------------------
// use body parser so we can grab information from POST requests

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// configure our app to handle CORS requests
app.use(function (req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, \
Authorization');
	next();
});


app.use(morgan('dev'));
// connect to our database
mongoose.connect('mongodb://localhost:27017/crm');

// basic route for the home page
app.get('/', function (req, res) {
	res.send('Welcome to the home page!');
});
var apiRouter = express.Router();

apiRouter.use(function (req, res, next) {

	console.log('Somebody just came to our app!');
	next();
});
apiRouter.post('/authenticate', function (req, res) {
	User.findOne({
		username: req.body.username
	}).select('name username password').exec(function (err, user) {
		if (err) throw err;
		if (!user) {
			res.json({
				success: false,
				message: 'Authentication failed. User not found.'
			});
		} else if (user) {
			var validPassword = user.comparePassword(req.body.password);
			if (!validPassword) {
				res.json({
					success: false,
					message: 'Authentication failed. Wrong password'

				});
			} else {
				var token = jwt.sign({
					name: user.name,
					username: user.username
				}, superSecret, {
						expiresInMinutes: 1440
					});
				res.json({
					success: true,
					message : 'Enjoy your token',
					token: token
				});
			}

		}
	});

});

	apiRouter.use(function (req, res, next) {
		// check header or url parameters or post parameters for token
		var token = req.body.token || req.param('token') || req.headers['x-access-token'];
		console.log(req.body.token);
		console.log(req.param('token'));
		console.log(req.headers['x-access-token']);
		// decode token
		if (token) {
			// verifies secret and checks exp
			jwt.verify(token, superSecret, function (err, decoded) {
				if (err) {
					return res.status(403).send({
						success: false,
						message: 'Failed to authenticate token.'
					});
				} else {
					// if everything is good, save to request for use in other routes
					req.decoded = decoded;
					next();
				}
			});
		} else {
			// if there is no token
			// return an HTTP response of 403 (access forbidden) and an error message
			return res.status(403).send({
				success: false,
				message: 'No token provided.'
			});
		}
		// next() used to be here
	});


apiRouter.get('/', function (req, res) {
	res.json({ message: 'Welcome to New World Rakesh' });
});

apiRouter.get('/me', function(req, res) {
res.send(req.decoded);
});
apiRouter.route('/users')
.post(function (req, res) {
			 var user = new User();
			 user.name = req.body.name;
			 user.username = req.body.username;
			 user.password = req.body.password;
	// save the user and check for errors
	user.save(function (err) {
		if (err) {
			if (err.code == 11000)
				return res.json({ success: false, message: 'A user with that\ username already exists. ' });
			else
				return res.send(err);
		}
		res.json({ message: 'User created!' });
	});
    })
.get(function (req, res) {
			 User.find(function (err, users) {
		if (err) res.send(err);
		// return the users
		res.json(users);
	});
});
// on routes that end in /users/:user_id
// ----------------------------------------------------
apiRouter.route('/users/:user_id')
         .get(function(req,res){
			 User.findById(req.params.user_id,function(err,user){
				 if(err) res.send(err);
				 res.json(user);
				 
			 });
			 
		 })
		 .put(function(req,res){
			User.findById(req.params.user_id, function(err, user) {
				if (err) res.send(err);
				if(req.body.name) user.name = req.body.name;
				if(req.body.username) user.username = req.body.username;
				if(req.body.password) user.password = req.body.password;
				
				user.save(function(err){
					if(err) res.send(err);
					
					res.json({message:'user Updated'});
				});
			});
		})
		.delete(function(req,res){
			User.remove({
				_id: req.params.user_id
			},function(err,user){
				if(err) return res.send(err);
				res.json({ message: 'Successfully deleted' });
				
			});
		});

			  
app.use('/api', apiRouter);
app.listen(port);
console.log('Magic happens on port ' + port);