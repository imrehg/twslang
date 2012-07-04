var mongoose = require('mongoose'),
    util = require('util');

var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  ;

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
    defs: [DefineSchema],
    define: {type: String},  // deleting
    example: {type: String},  // deleting
    uv: {type: Number},  //deleting
    dv: {type: Number}  //deleting
});

mongoose.connect('mongodb://'+process.env.MONGO_USER+':'+process.env.MONGO_PASS+'@'+process.env.MONGO_URL+'/'+process.env.MONGO_DB);
var WordModel = mongoose.model('Word', WordSchema);

WordModel.find({}, function(err, docs) {
   for (var i in docs) {
       var doc = docs[i];
       // console.log(doc);
       if (doc.define) {
         console.log("Change: "+ doc.word);
         doc.defs.push({ def: doc.define, ex: doc.example });
         doc.define = undefined;
         doc.example = undefined;
         doc.uv = undefined;
         doc.dv = undefined;
         doc.save(function(err) {
             if (err) {
                 console.log(err);
	     } else {
		 console.log("Saved");
		 console.log(util.inspect(doc));
	     }
         });
       }
   }
});
