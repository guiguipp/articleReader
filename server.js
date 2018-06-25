const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const mongoose = require("mongoose");

// Our scraping tools (using request-promise rather than axios)
// It works on the client and on the server
const cheerio = require("cheerio");
const request = require("request")
const rp = require('request-promise');

// Require all models
const db = require("./models");

const PORT =  process.env.URL || 3000;

// Initialize Express
const app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Connect to the Mongo DB
const mongoDB = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.Promise = Promise;
mongoose.connect(mongoDB)

// Routes
// A GET route for scraping our website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with request
  const options = {
    uri: `http://bibliobs.nouvelobs.com`,
    transform: function (body) {
    return cheerio.load(body);
    }
};

rp(options)
    .then(($) => {
        $('article.obs-article').each(function(i, elem) {
            // console.log(elem)
            let result = {}
            result.title = $(this)
                .children("a")
                .attr("title")
            result.link = $(this)
                .children("a")
                .attr("href")
            result.summary = $(this)
                .children("p.obs-article-summary")
                .text()
            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function(dbArticle) {
                // View the added result in the console
                console.log(dbArticle);
                })
                .catch(function(err) {
                // If an error occurred, send it to the client
                return res.json(err);
                });
            });
            res.send("Scrape Complete");
            })
        .catch((err) => {
        console.log(err);
        });
      });


// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  db.Article.find({})
    .then(function(dbArticle){
      res.json(dbArticle);
    })
    .catch(function(err){
      res.json(err);
    })
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  db.Article.findOne({_id: req.params.id})
    .populate("note")  
    .then(function(Article){
        res.json(Article);
      })
      .catch(function(err){
        res.json(err);
      })
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  db.Note.create(req.body)
    .then((createdNote) => {
      return db.Article.findByIdAndUpdate(req.params.id, { $set: { note: createdNote._id}}, { new: true });
    })
    .then(function(updatedArticle) {
      res.send(updatedArticle)
    })
});

app.get("/clear", function(req,res){
  db.Article.remove({}, (req.params.todoId, (err, todo) => {  
    // As always, handle any potential errors:
    if (err) return res.status(500).send(err);
    const response = {
        message: "Articles successfully deleted",
    };
    return res.status(200).send(response);
    })
  );
})

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
