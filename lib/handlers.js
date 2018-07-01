var _data = require('./data');
var https = require('https');
var helpers = require('./helpers');

var handlers = {};

handlers.ping = function(data,callback){
    callback(200);
};

handlers.notFound = function(data,callback){
  callback(404);
};

handlers.users = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._users[data.method](data,callback);
  } else {
    callback(405);
  }
};

handlers._users  = {};

handlers._users.post = function(data,callback){
  console.log(data.payload);
  // Check that all required fields are filled out
  var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var portfolio = typeof(data.payload.portfolio) == 'object' ? data.payload.portfolio : false;

  if(email && password && portfolio){
    // Make sure the user doesnt already exist
    _data.read('users',email,function(err,data){
      if(err){
        // Hash the password
        //var hashedPassword = helpers.hash(password);

        // Create the user object
        if(password){
          var userObject = {
            'email' : email,
            'password' : password,
            'portfolio' : portfolio
          };

          // Store the user
          _data.create('users',email,userObject,function(err){
            if(!err){
              callback(200);
            } else {
              console.log(err);
              callback(500,{'Error' : 'Could not create the new user'});
            }
          });
        } else {
          callback(500,{'Error' : 'Could not hash the user\'s password.'});
        }

      } else {
        // User alread exists
        callback(400,{'Error' : 'A user with that phone number already exists'});
      }
    });

  } else {
    callback(400,{'Error' : 'Missing required fields'});
  }

};

handlers._users.get = function(data,callback){
  // Check that email number is valid
  var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;
  if(email){
    // Lookup the user
    _data.read('users',email,function(err,data){
      if(!err && data){
        delete data.password;
        callback(200,data);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};

handlers._users.put = function(data,callback){
// Check for required field
var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length == 10 ? data.payload.email.trim() : false;

// Check for optional fields
var portfolio = typeof(data.payload.portfolio) == 'object' ? data.payload.portfolio : false;

// Error if phone is invalid
if(email){
    // Error if nothing is sent to update
    if(portfolio){
    // Lookup the user
    _data.read('users',email,function(err,userData){
        if(!err && userData){
        // Update the fields if necessary
        userData.portfolio = portfolio;
        // Store the new updates
        _data.update('users',email,userData,function(err){
            if(!err){
            callback(200);
            } else {
            console.log(err);
            callback(500,{'Error' : 'Could not update the user.'});
            }
        });
        } else {
        callback(400,{'Error' : 'Specified user does not exist.'});
        }
    });
    } else {
    callback(400,{'Error' : 'Missing fields to update.'});
    }
} else {
    callback(400,{'Error' : 'Missing required field.'});
}

};

handlers.portfolio = function(data,callback){
    var acceptableMethods = ['get'];
    if(acceptableMethods.indexOf(data.method) > -1){
      handlers._portfolio[data.method](data,callback);
    } else {
      callback(405);
    } 
}

handlers._portfolio  = {};

handlers._portfolio.get = function(data,callback){

    var currencyToConvert = 'GBP';
    // Check that email number is valid
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 ? data.queryStringObject.email.trim() : false;
    if(email){
      // Lookup the user
      _data.read('users',email,function(err,userData){
        if(!err && userData){
          https.get('https://api.coinmarketcap.com/v2/ticker/?convert='+currencyToConvert, (resp) => {
            let response = '';
            resp.on('data', (chunk) => {
                response += chunk;
            });
            resp.on('end', () => {
                var responseObject = helpers.parseJsonToObject(response);
                delete userData.password;
                userData.totalValue = 0;
                userData.currency = currencyToConvert;
                for(var i = 0; i < userData.portfolio.length; i++){
                  for (var key in responseObject.data) {
                    if(responseObject.data[key].symbol == userData.portfolio[i].name){
                      userData.portfolio[i].unitPrice = responseObject.data[key].quotes[currencyToConvert].price;
                      userData.portfolio[i].value = userData.portfolio[i].unitPrice * userData.portfolio[i].amount;
                      userData.totalValue += userData.portfolio[i].value;
                    }
                  }
                }
                callback(200,userData);
            });
          }).on("error", (err) => {
            console.log("Error: " + err.message);
          });
        } else {
          callback(404);
        }
      });
    } else {
      callback(400,{'Error' : 'Missing required field'})
    }
  };

// Export the handlers
module.exports = handlers;