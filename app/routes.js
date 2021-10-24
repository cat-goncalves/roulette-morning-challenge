module.exports = function(app, passport, db) {

// game logic ===============================================================
let choices = ['red', 'blue', 'yellow']
function outcome(a, b){
  return a === b ?  'Win' : 'Lose'
}

// normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get('/', function(req, res) {
        res.render('index.ejs',{winner: null} );
    });

    // PROFILE SECTION ========================= ADMIN LOGIN
    app.get('/profile', isLoggedIn, function(req, res) {
        db.collection('bet').find().toArray((err, result) => {
          if (err) return console.log(err)

          let bank = 1000000
          let wins = 0
          let losses = 0
          for (let i = 0; i < result.length; i++){
            if (result[i].winner === 'Win'){
              //this is if the player wins
              bank -= result[i].bet
              wins += result[i].bet
            } else {
              bank += result[i].bet
              losses += result[i].bet
            }
          }
          res.render('profile.ejs', {
            user : req.user,
            bank: bank,
            wins: wins,
            losses: losses
          })
        })
    });

    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

// message board routes ===============================================================

    app.post('/roulette', (req, res) => {
      let playerChoice = req.body.color
      let botChoice = choices[Math.floor(Math.random() * choices.length)]

      let result = outcome(playerChoice, botChoice)

      db.collection('bet').save({
        bet: parseFloat(req.body.bet), 
        color: req.body.color,
        winner: result
}, (err, result) => {
        if (err) return console.log(err)
        console.log('saved to database')
        res.render('index.ejs', {winner: result, botChoice, playerChoice})
      })
    })

    app.put('/messages', (req, res) => {
      db.collection('messages')
      .findOneAndUpdate({name: req.body.name, msg: req.body.msg}, {
        $set: {
          thumbUp:req.body.thumbUp + 1
        }
      }, {
        sort: {_id: -1},
        upsert: true
      }, (err, result) => {
        if (err) return res.send(err)
        res.send(result)
      })
    })

    app.delete('/messages', (req, res) => {
      db.collection('messages').findOneAndDelete({name: req.body.name, msg: req.body.msg}, (err, result) => {
        if (err) return res.send(500, err)
        res.send('Message deleted!')
      })
    })

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

    // locally --------------------------------
        // LOGIN ===============================
        // show the login form
        app.get('/login', function(req, res) {
            res.render('login.ejs', { message: req.flash('loginMessage') });
        });

        // process the login form
        app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

        // SIGNUP =================================
        // show the signup form
        app.get('/signup', function(req, res) {
            res.render('signup.ejs', { message: req.flash('signupMessage') });
        });

        // process the signup form
        app.post('/signup', passport.authenticate('local-signup', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/signup', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

    // local -----------------------------------
    app.get('/unlink/local', isLoggedIn, function(req, res) {
        var user            = req.user;
        user.local.email    = undefined;
        user.local.password = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}
