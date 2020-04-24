module.exports = {

	mongo : null,
	app : null,
	fs: null,
	logger: null,

	/**
	 * Initializes the database manager object
	 * @param app		The app object, it does contain the token to connect to the database
	 * @param mongo		MongoDB object, to make the database operations
	 * @param fs		Fyle System object, to load the default configs
	 * @param logger	Log4JS object, to log the operations
	 */
	init : function(app, mongo, fs, logger) {
		this.mongo = mongo;
		this.app = app;
		this.fs = fs;
		this.logger = logger;
	},

	/**
	 * Extraction of the connection to the database, connects to the database and performs the operation
	 * @param callback					Callback function extended
	 * @param operation					Operation to do in the database when connected
	 */
	connect: function (callback, operation) {
		let logger = this.logger;
		this.mongo.MongoClient.connect(this.app.get("db"), function (err, db) {
			if (err) {
				logger.error("Unable to connect to the database");
				callback(null);
			} else {
				operation(db, logger);
				db.close();
			}
		});
	},

	/**
	 * Clears the database and inserts the default data
	 */
	reset: function() {
		this.logger.info("Reset of the database invoked");
		// Loads the data from the config files
		let defaultdb = JSON.parse(this.fs.readFileSync("config/defaultdb.json"));

		// Clears the users collection and fills it again
		this.clear("users", () => {
			defaultdb.users.forEach((user) => {
				user.password = this.app.get("encrypt")(user.password);			// Password encryption
				this.insertUser(user, () => {})							// User insertion
			});
		});
	},

	/**
	 * Clears the specified collection and calls to the next step
	 * @param collection				Name of the collection to clear
	 * @param callback					Callback function
	 */
	clear: function(collection, callback) {
		this.connect(callback, function (db, logger) {
			db.collection(collection).remove();				// Clears the specified collection
			callback();
			logger.info("The database has been cleared. The database is now empty.");
		});
	},

	/**
	 * Asynchronously retrieves the results of a query over a specified collection
	 * @param collection		Collection to look
	 * @param query				Query of the object to retrieve
	 */
	get: async function (collection, query) {
		let logger = this.logger;
		return this.mongo.MongoClient.connect(this.app.get("db"), null).then((db) => {
			return db.collection(collection).find(query).toArray();
		}).catch((err) => logger.error(err));
	},

	/**
	 * Asynchronously retrieves the results of a query over a specified collection
	 * @param collection		Collection to look
	 * @param query				Query of the object to retrieve
	 * @param callback			Callback function
	 */
	cb_get: function (collection, query, callback) {
		this.connect(callback, (db) => {
			db.collection(collection).find(query).toArray((err, result) => {
				(err) ? callback(null) : callback(result);
			});
		});
	},

	/*****************************************************************************\
 										USERS
	\*****************************************************************************/

	/**
	 * Inserts the user into the collection of users
	 * @param user			User to insert in the database
	 * @param callback		Callback function
	 */
	insertUser : function (user, callback) {
		this.connect(callback, function(db, logger) {
			db.collection("users").insert(user, function(err, result) {
				if (err) {
					logger.error("Unable to insert " + user);
					callback(null);
				} else {
					logger.info("New user inserted in the database: " + user.email + " (" + result.ops[0]._id + ")");
					callback(result.ops[0]._id);
				}})
		});
	},

	/**
	 * Returns the collection of users
	 * @criterion
	 * @param callback		Callback function
	 */
	getUsers : function(criterion, callback) {
		this.connect(callback, function(db, logger) {
			db.collection("users").find(criterion).toArray(function(err, usuarios) {
				if (err) {
					callback(null);
				} else {
					callback(usuarios);
				}
				db.close();
			});
		});
	},

};