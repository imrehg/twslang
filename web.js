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

var DefineSchema = new Schema({
    did: ObjectId,  // definition id
    def: {type: String, required: true},  // definition
    ex: {type: String, default: ''},  // examples
    uv: {type: Number, default: 0},  // upvotes
    dv: {type: Number, default: 0}  // downvotes
});

var WordSchema = new Schema({
    wid: ObjectId,
    word: {type: String, required: true},
    defs: [DefineSchema]
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
	var newid = uuid.v4();
	res.cookie('id', newid);
	addEvent("newVisit", "by id:"+newid);
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
    newWord.defs.push({ def: wordData.define, ex: wordData.example });
    newWord.save(function(err){
        console.log(err);
	if (!err) {
	    addEvent("addWord", "by id:"+req.cookies.id+";word:"+wordData.word);
	} else {
	    addEvent("addWordError", err);
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

// New definition form
app.get("/adddef/:id", function(req, res) {
    checkSetId(req, res);
    var id = req.params.id;
    WordModel.findOne({"_id": id}, function (err, doc) {
	if (!err) {
	    res.render('adddef.ejs',
		       { title: "Add definition: "+doc.word,
			 word: doc
		       });
	}
    });
});

function addDefinition(id, wordData, req) {
    WordModel.findOne({"_id": id}, function (err, doc) {
	doc.defs.push({ def: wordData.define, ex: wordData.example });
	doc.save(function(err){
	    console.log(err);
	    if (!err) {
		addEvent("addDef", "by id:"+req.cookies.id+";word:"+wordData.word);
	    } else {
		addEvent("addDefError", err);
	    }
	});
    });
};

// Actually adding new definition
app.post("/adddef/:id", function(req, res) {
    checkSetId(req, res);
    var id = req.params.id;
    var wordData = req.body;
    if (wordData.define) {
	addDefinition(id, wordData, req);
    }
    res.redirect('/word/'+id);
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
