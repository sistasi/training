//init
require('dotenv').config();
const express=require("express"),
mysql = require ("mysql"),
cors = require('cors'),
bodyParser = require ("body-parser");

const app = express();

var whitelist = ['http://localhost:4200']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
        console.log("origin:", origin)
      callback(new Error('Not allowed by CORS'))
    }
  }
}
app.use(cors());
const API_URI = "/api";
const queryFilm = "select * from film limit ? offset ?";
const queryFilmById = "select * from film where film_id=?";
const queryFilmByIdWithLimitOffset = "select * from film where film_id=? limit ? offset ?";
const queryFilmWithBothParam = "select * from film where (title like ?) || (description like ?) limit ? offset ?";
const queryBookById = "select * from books where id=?";

//DB_HOST ="localhost"
//DB_PORT = 3306
//DB_USER = root
//DB_PWD = "123456"
//DB_NAME = "sakilla"
//DB_CONLIMIT = 4
var pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME,
    connectionLimit: process.env.DB_CONLIMIT

});

console.log("DB User:", process.env.DB_USER);

var makeQueryWithPromise = (sql,pool)=>{
    console.log("SQL is:", sql);
    return (args)=>{
        let queryPromise = new Promise((resolve, reject)=>{
            pool.getConnection((err, conn)=>{ 
                if(err){
                    reject(err);
                    return;
                }
                conn.query(sql, args||[], (err, results)=>{
                    conn.release();
                    if (err){
                        reject(err);
                        return;
                    }
                    resolve(results);
                    
                })
            });
        });
       
        return queryPromise;
    }
};

var findAllFilms = makeQueryWithPromise(queryFilm, pool);
var findFilmsByBothParam = makeQueryWithPromise(queryFilmWithBothParam, pool);
var findFilmById = makeQueryWithPromise(queryFilmById, pool);
var findBookById = makeQueryWithPromise(queryBookById, pool);
var findFilmByIdWithLimitOffset = makeQueryWithPromise(queryFilmByIdWithLimitOffset, pool)
//router
app.use(express.static(__dirname+"/../dist/myproject"));
app.use(bodyParser.urlencoded({extended: false}));

app.use(bodyParser.json());

app.get(API_URI + '/films', (req, res) => {
    console.log(">>Query param: ", req.query);
    const filmId = req.query.filmId;
    const limit = parseInt(req.query.limit) || 1;
    const offset = parseInt(req.query.offset) || 1;
    const keyword = req.query.keyword;
    const selectionType = req.query.selectionType;
    if (typeof(filmId) !== 'undefined' && filmId != ''){
        console.log("findFilmByIdWithLimitOffset");
        findFilmByIdWithLimitOffset([filmId, limit, offset]).then((results)=>{
            res.json(results);
        }).catch((error)=>{
            res.status(500).json(error);
        });
    }
    else if  (typeof(selectionType) !== 'undefined'){
        console.log("findFilmsByBothParam");
        findFilmsByBothParam([selectionType=='title'||selectionType=='both'?'%'+keyword+'%':'', 
        selectionType=='description'||selectionType=='both'?'%'+keyword+'%':'', limit, offset])
        .then((results)=>{
            res.json(results);
        }).catch((error)=>{
            console.log("Error in finding films:",error);
            res.status(500).json(error);
        });
    }
    else {
        console.log("findAllFilms");
        findAllFilms([limit, offset]).then((results)=>{
            res.json(results);
        }).catch((error)=>{
            console.log("Error in finding films:",error);
            res.status(500).json(error);
        });
    }
    
});

app.get(API_URI + '/films/:filmId', (req, res)=>{
    let filmId = req.params.filmId;
    console.log(filmId);
    findFilmById([filmId]).then((results)=>{
        res.json(results);
    }).catch((error)=>{
        res.status(500).json(error);
    });
});

app.get(API_URI + '/books/:bookId', (req, res)=>{
    let bookId = req.params.bookId;
    console.log(bookId);
    findBookById([bookId]).then((results)=>{
        res.json(results);
    }).catch((error)=>{
        res.status(500).json(error);
    });
});

app.get(API_URI + '/books', (req, res)=>{
    let bookId = req.query.bookId;
    console.log(bookId);
    findBookById([bookId]).then((results)=>{
        res.json(results);
    }).catch((error)=>{
        res.status(500).json(error);
    });
});

//startup
const PORT = parseInt(process.argv[2]) || parseInt(process.env.APP_PORT) || 3000;

app.listen(PORT, ()=> {
    console.log(`Listening to port ${PORT}`)
})