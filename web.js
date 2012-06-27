var express = require('express')
  , util = require('util')
  , ejs = require('ejs')
  , mongoose = require('mongoose')
  , uuid = require('node-uuid')
  , async = require('async')
  ;

var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  ;

var app = express.createServer(
    express.logger()
  , express.static(__dirname + '/public')
  , express.bodyParser()
  , express.cookieParser()
  , express.session({secret: process.env.SESSION_SECRET || 'dsaf43kjLKGiu34'})
  , express.errorHandler()
);

var EventSchema = new Schema({
    date: {type: Date, default: Date.now },
    event: {type: String, required: true},
    msg: {type: String, default: '' }
});

var WordSchema = new Schema({
    wid: ObjectId,
    word: {type: String, required: true},
    define: {type: String, required: true},
    example: {type: String, default: ''},
    uv: {type: Number, default: 0},
    dv: {type: Number, default: 0}
});

mongoose.connect('mongodb://'+process.env.MONGO_USER+':'+process.env.MONGO_PASS+'@'+process.env.MONGO_URL+'/'+process.env.MONGO_DB);
var WordModel = mongoose.model('Word', WordSchema);
var EventModel = mongoose.model('Event', EventSchema);

// Add a new event to the logs
function addEvent(event, msg) {
    var newEvent = new EventModel();
    newEvent.event = event;
    newEvent.msg = msg;
    newEvent.save();
};

app.configure(function() {
    app.use(express.methodOverride());
    app.use(app.router);
});

function checkSetId(req, res) {
    if (!req.cookies.id) {
	res.cookie('id', uuid.v4());
    } else {
	console.log(req.cookies.id);
    }
}

// // Get random word
// app.get("/random", function(req, res) {
//     checkSetId(req, res);
//     res.send("Looking for random word");
// });

// Look up words
app.get("/word/:id", function(req, res) {
    checkSetId(req, res);
    var id = req.params.id;
    WordModel.findOne({"_id": id}, function (err, doc) {
	if (!err) {
	    console.log(doc);
	    addEvent("checkWord", "by id:"+req.cookies.id+";word:"+doc._id);
	    res.render('word.ejs',
		       { title: "Define: "+doc.word,
			 word: doc
		       });
	}
    });
});

// New word add form
app.get("/addword", function(req, res) {
    checkSetId(req, res);
    res.render('addword.ejs',
	       { title: "Add new word"
	       });
});

function addWord(wordData, req) {
    var newWord = new WordModel();
    newWord.word = wordData.word;
    newWord.define = wordData.define;
    newWord.example = wordData.example;
    newWord.save(function(err){
	if (!err) {
	    addEvent("addWord", "by id:"+req.cookies.id+";word:"+wordData.word);
	} else {
	    addEvent("addWordError", error);
	}
    });
}; 

// Actually adding new word
app.post("/addword", function(req, res) {
    checkSetId(req, res);
    var wordData = req.body;
    addWord(wordData, req);
    res.render('addword.ejs',
	       { title: "Add new word",
		 newword: wordData
	       });
});

app.get("/monitor", function(req, res) {
    async.parallel([
	function(cb){
	    EventModel.find({"event": "checkWord"}, function(err, docs) {
		var wordviews = docs.length;
		cb(null, {"Word views": wordviews});
	    });
	},
	function(cb){
	    EventModel.find({"event": "addWord"}, function(err, docs) {
		var wordviews = docs.length;
		cb(null, {"Words added": wordviews});
	    });
	}
    ],
		   function(err, results) {
		       var out = '<html><head><title>Metrics</title></head><body>';
		       for (i in results) {
			   for (resname in results[i]) {
			       out += "<strong>" + resname + ":</strong> " + results[i][resname] + "<br>";
			   }
		       }
		       out += "</body><html>"
		       res.send(out);
		   });
});


// Main page
app.get("/", function(req, res) {
    checkSetId(req, res);
    WordModel.find({}, ['_id', 'word', 'define'], function (err, docs) {
	if (!err) {
	    console.log(util.inspect(docs))
	    res.render('index.ejs',
		       { title: "台灣俚語字典 TaiwanSlang",
			 words: docs
		       });
	}
    });
});

var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});
