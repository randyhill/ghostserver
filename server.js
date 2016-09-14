var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var CONTACTS_COLLECTION = "contacts";

var app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded

var mongoURI = 'mongodb://localhost/ghostpics';

// Connect to the database before starting the application server. 
mongodb.MongoClient.connect(process.env.MONGODB_URI || mongoURI, function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});

// CONTACTS API ROUTES BELOW

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

/*  "/contacts"
 *    GET: finds all contacts
 *    POST: creates a new contact
 */

app.get("/contacts", function(req, res) {
  db.collection(CONTACTS_COLLECTION).find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get contacts.");
    } else {
      res.status(200).json(docs);  
    }
  });
});

app.post("/contacts", function(req, res) {
  var newContact = req.body;
  newContact.createDate = new Date();

  if (!(req.body.firstName || req.body.lastName)) {
    handleError(res, "Invalid user input", "Must provide a first or last name.", 400);
  }

  db.collection(CONTACTS_COLLECTION).insertOne(newContact, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new contact.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

/*  "/contacts/:id"
 *    GET: find contact by id
 *    PUT: update contact by id
 *    DELETE: deletes contact by id
 */

app.get("/contacts/:id", function(req, res) {
  db.collection(CONTACTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to get contact");
    } else {
      res.status(200).json(doc);  
    }
  });
});

app.put("/contacts/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(CONTACTS_COLLECTION).updateOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to update contact");
    } else {
      res.status(204).end();
    }
  });
});

app.delete("/contacts/:id", function(req, res) {
  db.collection(CONTACTS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete contact");
    } else {
      res.status(204).end();
    }
  });
});

// ---------------------- File Upload ----------------------
var fs = require('fs-extra');       //File System - for file manipulation
var busboy = require("connect-busboy");
app.use(busboy());

app.post("/upload", function(req, res) {
  if(req.busboy) {
    var fstream;
    req.busboy.on("file", function(fieldName, fileStream, fileName, encoding, mimeType) {
      //Handle file stream here
      console.log("Uploading: " + fileName);

      //Path where image will be uploaded
      var localName = randomName(12)
      var localPath = './img/' + localName; //__dirname + '/img/' + fileName;
      fstream = fs.createWriteStream(localPath);
      fileStream.pipe(fstream);
      fstream.on('close', function () {
        console.log("Upload Finished of " + localName);
        //res.redirect('back');           //where to go next
        res.status(200).json(localName);
      });
    });
    req.busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype){
      console.log('Field [' + fieldname + ']: value: ' + inspect(val));
    })
    req.busboy.on('error', function(err) {
      console.log(err)
    })
    req.busboy.on("finish", function() {
      console.log("finished")
    })
    return req.pipe(req.busboy);
  }
  //Something went wrong -- busboy was not loaded
});

function randomName(length) {
  var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  var result = '';
  for (var i = length; i > 0; i-=1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result
}

app.get("/download/:id", function(req, res){
  var filePath = "./img/" + req.params.id;
  console.log("downloading file: " + filePath);
  res.download(filePath, req.fileName, function (err) {
    if (err == null) {
      fs.remove(filePath, function (err) {
        if (err == null) {
          console.log("file deleted");
        } else {
          console.log("could not delete file" + err);
        }
      });
      res.status(200);
    } else {
      res.download("./public/GHPMessage.png", function(err){
        if (err == null) {
          res.status(200);
        } else {
          console.log("error in download" + err);
          res.status(err.status)
        }
      })
    }
  })
});

app.get("/exists/:id", function(req, res){
  var filePath = "./img/" + req.params.id;
  fs.access(filePath, function(err){
    if (err) {
      // No access, file doesn't exist, return file not found error
      console.log("file didn't exist" + err)
      res.status(404).json("file doesn't exist");
    } else {
      console.log("file exists: " + filePath)
      res.status(200).json("file exists")
    }
  })
});