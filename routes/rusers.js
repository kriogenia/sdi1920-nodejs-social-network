module.exports = function(app, swig, dbManager) {

	/*****************************************************************************\
 										GET
	\*****************************************************************************/

	/**
	 * Loads the register page
	 */
	app.get("/signup", function(req, res) {
		app.get("logger").info("An anonymous user accessed to the register");
		const {errors, inputs} = cleanSession(req);
		// We render the register page with the retrieved error and user inputs
		res.send(swig.renderFile("views/register.html", {
			errors: errors,
			inputs: inputs
		}));
	});

	/**
	 * List and renders the list of all the users of the application
	 */
	app.get("/users", function(req, res) {
		app.get("logger").info("The user " + req.session.user + " accessed to the user list");
		// We want all the users except the current and the admins
		let query = {
			email: { $ne : req.session.user },
			role: { $ne : "ADMIN" },
		};
		dbManager.get("users", query, (result) => {
			let answer = swig.renderFile("views/users.html", {
				users: result
			});
			res.send(answer);
		});
	});

	/**
	 * Loads the login page
	 */
	app.get("/login", function(req, res) {
		app.get("logger").info("An anonymous user accessed to the login form");
		let errors = req.session.errors;
		req.session.errors = null;
		let answer = swig.renderFile('views/login.html', {errors: errors});
		res.send(answer);
	});

	/*****************************************************************************\
 										POST
	\*****************************************************************************/

	/**
	 *	Registers the user in the app
	 */
	app.post("/signup", function(req, res) {
		checkValidRegister(req).then((errors) =>{
			// In case of errors, redirects to the register page
			if (errors.length > 0) {
				req.session.errors = errors;
				// Stores some inputs to improve usability
				req.session.inputs = {
					name: req.body.name,
					surname: req.body.surname,
					email: req.body.email
				};
				res.redirect("/signup");
				return;
			}
			// User object creation
			let user = {
				name: req.body.name,
				surname: req.body.surname,
				email : req.body.email,
				password : app.encrypt(req.body.password),
				friends: []
			};
			// User insertion
			dbManager.insertUser(user, function(id) {
				if (id == null) {
					req.session.user = null;
					res.redirect("/signup");
				} else {
					req.session.user = user.email;
					app.get("logger").info("The user" + user.email + " has registered and logged in");
					res.redirect("/users");
				}
			});
		});
	});

	/**
	 * Logs in the user in the app
	 */
	app.post("/login", function(req, res) {
		let query = {
			email : req.body.email,
			password : app.encrypt(req.body.password),
		};
		dbManager.get("users", query, function(users) {
			if (users == null || users.length === 0) {
				req.session.errors = [{type: "warning", msg: "Incorrect email or password"}];
				req.session.user = null;
				app.get("logger").info("The user" + user.email + " has logged in");
				res.redirect("/login");
			} else {
				req.session.user = users[0].email;
				res.redirect("/users");
			}
		});
	});

	/*****************************************************************************\
	 								INPUT CHECKS
	\*****************************************************************************/

	/**
	 * Checks all the inputs of the register form and returns all the errors
	 * @param req			Contains the inputs and session
	 * @returns {boolean}	Assert if there where any errors so the register thread doesn't save the user
	 */
	let checkValidRegister = async (req) => {
		let errors = [];
		// Email unique check, asynchronous
		const result = dbManager.get("users", {email: req.body.email});
		// Name check
		if (!req.body.name || req.body.name.length < 3)
			errors.push({type: "warning", msg: "The name can't be less than three characters long"});
		// Surname check
		if (!req.body.surname || req.body.surname.length < 3)
			errors.push({type: "warning", msg: "The surname can't be less than three characters long"});
		// Email check
		if (!req.body.email || req.body.email.length < 3)
			errors.push({type: "warning", msg: "The entered email is not valid"});
		// Password check
		if (!req.body.password || !req.body.password_repeated || req.body.password !== req.body.password_repeated)
			errors.push({type: "warning", msg: "The passwords does not match"});
		if (req.body.password.length < 3)
			errors.push({type: "danger", msg: "This password is not secure enough"});
		return await result.then((result) => {
			if (result.length > 0)
				errors.push({type: "warning", msg: "The entered email is already in use"});
			// Returns the errors collected
			return errors;
		}).catch((err) => console.error(err));
	};
};