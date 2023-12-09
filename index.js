const express = require('express');
const session = require('express-session');
const request = require('request');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const crypto_manager = require('./crypto_manager.js');
const database = require('./database.js');
const traitement_image = require('./traitement_image.js');
const querystring = require("querystring");

console.log(process.env['SERVER_URL'] + "/spotifycallback")

//require('dotenv').config();


//const { auth_voir_admin} = require('./config.json');


const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: true, saveUninitialized: true }));
app.set('view engine', 'ejs');

function log(string) {
  console.log("[APP]" + string);
}



const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 50 tentatives maximum par fenêtre
  handler: (req, res) => {
    if (req.session.utilisateur) {
      log("[LIMITE!] " + req.session.utilisateur.username + " a dépassé la limite de tentatives de connexion");
    }
    else {
      log("[LIMITE!] Quelqu'un a dépassé la limite de tentatives de connexion");
    }
    res.status(429).json({
      error: 'Trop de tentatives à partir de cette adresse IP. Veuillez réessayer après 15 minutes.'
    });
  }
});


// Route pour la page d'accueil
app.get('/', async (req, res) => {

  const auth = await database.verifAuthLevel(req, res, "/")
  if (auth >= 0) {
    const music_token = await database.getUserMusicToken(req.session.utilisateur.username)
    if( music_token == -1 || (music_token[0] == -1) && (music_token[0] == music_token[1]) && (music_token[1] == music_token[2]) )
    {
      res.redirect("/connexion-musique")
      return
    }
    res.render('acceuil', { username: req.session.utilisateur.username });
  } else {
    res.redirect('/login');
  }
});

//login
app.get('/login', (req, res) => {
  res.render('login', { erreur: null });
});

//login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const usernameNormalized = username.toLowerCase();
  const utilisateur = await database.chercherUtilisateur(usernameNormalized);

  if (utilisateur && await bcrypt.compare(password, utilisateur.password)) {

    const randomId = crypto.randomBytes(16).toString('hex'); // Génère un ID aléatoire

    const modified = await database.updateUser(usernameNormalized, { session_id: randomId })

    if (modified) {
      req.session.utilisateur = { session_id: randomId, username: utilisateur.username };
      res.redirect('/');
      return
    }
    else {
      res.render('login', { erreur: 'Une erreur est survenue lors de la connexion. Veuillez réessayer.' });
    }
  } else {
    res.render('login', { erreur: 'Nom d\'utilisateur ou mot de passe incorrect' });
  }
});

// Route pour la page d'inscription
app.get('/signup', (req, res) => {
  res.render('signupv2', { erreur: null });
});

// Route pour gérer l'inscription
app.post('/signup', limiter, async (req, res) => {

  const { username, password, nom, prenom } = req.body;

  // Vérifiez si l'utilisateur existe déjà dans la base de données
  const usernameNormalized = username.toLowerCase();
  const utilisateur = await database.chercherUtilisateur(usernameNormalized);
  if (utilisateur) {
    return res.render('signup', { erreur: 'Nom d\'utilisateur déjà utilisé' });
  }

  // Hachez le mot de passe avant de le stocker dans la base de données
  const hash = await bcrypt.hash(password, 10);

  // Enregistrez les nouvelles informations d'identification dans la base de données
  const created = await database.createUser(usernameNormalized, hash, nom, prenom, 0 )
  if (created) {
    log("[Inscription] Nouvel utilisateur: " + usernameNormalized);
    res.redirect('/login');
  } else {
    res.render('signup', { erreur: 'Échec de la création du compte. Veuillez réessayer.' });
  }

});

// Route pour la déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

let song_list=
  [
  {
    image_urls: [
      'https://i.scdn.co/image/ab67616d0000b273550b4528f31fd28007a97ab9',
      'https://i.scdn.co/image/ab67616d00001e02550b4528f31fd28007a97ab9',
      'https://i.scdn.co/image/ab67616d00004851550b4528f31fd28007a97ab9'
    ],
    titre: 'KILLCAM',
    artiste: 'NeS',
    id: '3MdbKq8mWOW0TB76PbcjnD',
    preview_url: 'https://p.scdn.co/mp3-preview/2653cc2ff542fb93f7fad2e9bedd283d48af4cb3?cid=0c78a05e835340c6999c6e41421325a9'
  },
  {
    image_urls: [
      'https://i.scdn.co/image/ab67616d0000b273db520bb005a31225511e6ddb',
      'https://i.scdn.co/image/ab67616d00001e02db520bb005a31225511e6ddb',
      'https://i.scdn.co/image/ab67616d00004851db520bb005a31225511e6ddb'
    ],
    titre: "LE SOURIRE D'UNE TOMBE",
    artiste: 'NeS',
    id: '4yIlzOPjaaEPsF3RyivxQD',
    preview_url: 'https://p.scdn.co/mp3-preview/fc77b8974fe2d0ddbce8bf99d169bc75ddefc67d?cid=0c78a05e835340c6999c6e41421325a9'

      },
  {
    image_urls: [
      'https://i.scdn.co/image/ab67616d0000b273908eee0051da19ce41cf1fa5',
      'https://i.scdn.co/image/ab67616d00001e02908eee0051da19ce41cf1fa5',
      'https://i.scdn.co/image/ab67616d00004851908eee0051da19ce41cf1fa5'
    ],
    titre: 'Goal',
    artiste: 'Josman',
    id: '3iS6fmjMrZUIqsrLOBkGmv',
    preview_url: 'https://p.scdn.co/mp3-preview/3b57d0784a775577ecf55e676d9aac7ef09ffa63?cid=0c78a05e835340c6999c6e41421325a9'
  },
       {
    image_urls: [
      'https://i.scdn.co/image/ab67616d0000b2735a7c027718559ea175420718',
      'https://i.scdn.co/image/ab67616d00001e025a7c027718559ea175420718',
      'https://i.scdn.co/image/ab67616d000048515a7c027718559ea175420718'
    ],
    titre: 'Ailleurs',
    artiste: 'Josman',
    id: '7ujxY1bqVRvMe1sR5iFmxt',
    preview_url: 'https://p.scdn.co/mp3-preview/8da0908f37f3c7aaf3c5eb794a06f49aca838de3?cid=0c78a05e835340c6999c6e41421325a9'
  }]

for(const song of song_list)
{
  traitement_image.isTextReadable(song.image_urls[0]).then((result) => 
    {
      song.text_black= !result;
      
  })
}

//login
app.get('/recommandation', (req, res) => {
  res.render('recommandation', { erreur: null, song_list });
});

const spotify_client_id = process.env['spotify_client_id']
const spotify_client_secret = process.env['spotify_client_secret']
app.get("/spotify",async (req, res) => {

  
  const auth = await database.verifAuthLevel(req, res, "/")
  if (auth < 0) {
    res.redirect('/login');
    return
  }
  
  //const username = req.session.utilisateur.username
  //const state = JSON.stringify({username:username});
  const scope = "user-read-private user-library-read playlist-modify-public playlist-modify-private user-library-modify playlist-read-private playlist-read-collaborative";
  res.redirect("https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: spotify_client_id,
      scope: scope,
      //state: state,
      redirect_uri: process.env['SERVER_URL'] + "/spotifycallback"
    }));
});

app.get("/spotifycallback", async (req, res) => {
  
  const auth = await database.verifAuthLevel(req, res, "/")
  if (auth < 0) {
    res.redirect('/login');
    return
  }

  const username = req.session.utilisateur.username

  const code = req.query.code || null;
  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code: code,
      redirect_uri: process.env['SERVER_URL'] + "/spotifycallback",
      grant_type: "authorization_code"
    },
    headers: {
      "Authorization": "Basic " + (Buffer.from(
        spotify_client_id + ":" + spotify_client_secret
      ).toString("base64"))
    },
    json: true
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {

      const tok = {access_token : crypto_manager.encrypt(body.access_token), refresh_token : crypto_manager.encrypt(body.refresh_token)}
      console.log(tok)
      database.updateUser(username, {spotify : JSON.stringify(tok)})
      //crypto.storeToken(id, body.access_token,body.refresh_token,"spotify", name)
      log(`[spotifycallback]🗂 ${username} s'est connecter avec spotify`)

    } else {
      log("[spotifycallback] Impossible de récupérer l'access token : " + JSON.stringify(response));
      res.send('erreur')
      return
    }
  });

  res.send(`
  <style>
  @import url('https://fonts.googleapis.com/css?family=Rubik:700&display=swap');
  body {
  display: flex;
  align-items: center;
  justify-content: center;

  margin: auto;
  font-size: 2em;
  font-family: 'Rubik', sans-serif;

}</style><body><div>Bien connecté à Spotify :)</div></body>`);
});


const deezer_client_id =  process.env['deezer_client_id']
const deezer_secret_id = process.env['deezer_client_secret']
app.get("/deezer", (req, res) => {

  
  const deezerAuthUrl = 'https://connect.deezer.com/oauth/auth.php';
  const scope = 'basic_access,email,offline_access,manage_library,manage_community,listening_history';
  const redirectUri = process.env['SERVER_URL'] + '/deezercallback'
  res.redirect(`${deezerAuthUrl}?app_id=${deezer_client_id}&redirect_uri=${redirectUri}&perms=${scope}`);
});

app.get("/deezercallback", async (req, res) => {
  const auth = await database.verifAuthLevel(req, res, "/")
  if (auth < 0) {
    res.redirect('/login');
    return
  }

  const username = req.session.utilisateur.username
  
    request.get({
      url: `https://connect.deezer.com/oauth/access_token.php?app_id=${deezer_client_id}&secret=${deezer_secret_id}`
    }, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const access_token = body.slice(13).split('&')[0];
        // Faites ce que vous devez faire avec access_token ici
        const tok = {access_token : crypto_manager.encrypt(access_token) }
        database.updateUser(username, {deezer : JSON.stringify(tok)})
        
        log(`[deezercallback]🗂 ${username} s'est connecter avec deezer`)
  res.send(`
  <style>
  @import url('https://fonts.googleapis.com/css?family=Rubik:700&display=swap');
  body {
  display: flex;
  align-items: center;
  justify-content: center;

  margin: auto;
  font-size: 2em;
  font-family: 'Rubik', sans-serif;

}</style><body><div>Bien connecté à deezer</div></body>`);
      } else {
      log("[deezercallback] Impossible de récupérer l'access token : " + JSON.stringify(response));
        res.send('erreur')
        return
        }
      });

  }
  
  );


app.get('/connexion-musique', (req, res) => {
  res.render('connexion-musique', { erreur: null });
});


// Écoutez le port
app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});


