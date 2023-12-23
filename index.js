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
const apiRoutes = require('./api');
const deezer_client = require('./deezer_client.js');

//require('dotenv').config();
//const { auth_voir_admin} = require('./config.json');


const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: true, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.use('/api', apiRoutes);


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

// connexion
app.get('/login', (req, res) => {
  res.render('loginv2', { erreur: null });
});

// connexion
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
      res.render('loginv2', { erreur: 'Une erreur est survenue lors de la connexion. Veuillez réessayer.' });
    }
  } else {

    res.render('loginv2', { erreur: "Nom d'utilisateur ou mot de passe incorrect (j'ai réinitialisé tous les comptes, faut en créer un nouveau)" });
  }
});

// inscription
app.get('/signup', async (req, res) => {

  res.render('signupv3', { erreur: null });
});

// inscription
app.post('/signup', limiter, async (req, res) => {

  const { username, password, nom, prenom, email } = req.body;

  // Vérifiez si l'utilisateur existe déjà dans la base de données
  const usernameNormalized = username.toLowerCase();
  const utilisateur = await database.chercherUtilisateur(usernameNormalized);
  if (utilisateur) {
    return res.render('signupv3', { erreur: 'Nom d\'utilisateur déjà utilisé' });
  }

  // Hachez le mot de passe avant de le stocker dans la base de données
  const hash = await bcrypt.hash(password, 10);

  // Enregistrez les nouvelles informations d'identification dans la base de données
  const created = await database.createUser(usernameNormalized, hash, nom, prenom,email, 0 )
  if (created) {
    log("[Inscription] Nouvel utilisateur: " + usernameNormalized);
    res.redirect('/login');
  } else {
    res.render('signup', { erreur: 'Échec de la création du compte. Veuillez réessayer.' });
  }

});

// déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Vérification auth
app.use(async (req, res, next) => {
  const auth = await database.verifAuthLevel(req, res, "middleware");
  if (auth < 0) {
    res.redirect('/login');
    return;
  }
  next();
});

app.get('/connexion-musique', async (req, res) => {
    res.render('connexion-musiquev2', { erreur: null });
});
app.get('/ecoute-seule', async (req, res) => {
  const auth = await database.verifAuthLevel(req, res, "/ecoute-seule")
  if (auth >= 0) {

    const usernameNormalized = req.session.utilisateur.username.toLowerCase();

    const modified = await database.updateUser(usernameNormalized, { spotify: 0,deezer :0 })

    if (modified) {

      res.redirect('recommandation');
      return;
    }
    else {
      res.render('connexion-musique', { erreur: 'Une erreur est survenue lors de la connexion. Veuillez réessayer. (20)' });
      return;
    }


  } else {

    res.redirect('/login');
  }

});

const spotify_client_id = process.env['spotify_client_id']
const spotify_client_secret = process.env['spotify_client_secret']
app.get("/spotify",async (req, res) => {

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

  const { code, error_reason } = req.query;
  if (error_reason === 'user_denied') {
    // Handle the case where the user denied the authorization
    res.send('Authorization denied');
    return
  }
  const username = req.session.utilisateur.username

    request.get({
      url: `https://connect.deezer.com/oauth/access_token.php?app_id=${deezer_client_id}&secret=${deezer_secret_id}&code=${code}`
    }, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const access_token = body.slice(13).split('&')[0];

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

  });

// Vérification connexion-musique
app.use(async (req, res, next) => {
  
    const usernameNormalized = req.session.utilisateur.username.toLowerCase();
    const music_token = await database.getUserMusicToken(usernameNormalized)
    if( music_token == -1 || (music_token[0] == -1) && (music_token[0] == music_token[1]) && (music_token[1] == music_token[2]) )
    {
      res.redirect("/connexion-musique")
      return
    }
  
  next();
});

// Route pour la page d'accueil
app.get('/', async (req, res) => {

    res.redirect('/recommandation');
});

app.get('/recommandation', async (req, res) => {

  const usernameNormalized = req.session.utilisateur.username.toLowerCase();
  let token = await database.getUserMusicToken(req.session.utilisateur.username)
  const connecte = (token[0] != 0)

  let playlists_historique = []
  let playlists_bibliotheque = []
  if(connecte)
  {
    if(token[0] != -1)
    {
      
    }
    else if(token[1] != -1)
    {
      const historique_pl = await database.recupererIdPlaylistHistorique(usernameNormalized)
      for(const id_pl of historique_pl) 
      {
        const info_pl = await deezer_client.getDeezerPlaylist(id_pl,token[1].access_token)
        playlists_historique.push(info_pl)
      }
      
      
      req_pl = await deezer_client.getRecentDeezerPlaylists(usernameNormalized)
      for(const playlist of req_pl)
      {
        const nm = playlist.title.toLowerCase()
        const name = nm.length > 25 ? nm.substring(0, 35) + '...' : nm
        const pic = [playlist.picture_small, playlist.picture_medium, playlist.picture_big]
        const id = playlist.id
        if(playlists_historique.find(pl => pl.id == id) == undefined)
        {
          playlists_bibliotheque.push({name,pic,id})
        }
        
      }
    }
  }
  const SERVER_URL = process.env['SERVER_URL']
  res.render('choix-recommandationv2', { erreur: null, playlists_bibliotheque,playlists_historique, connecte_musique : connecte,SERVER_URL });
});

app.post('/recommandation', async(req,res) => 
  {
    const liste_son_seed_reco = JSON.parse(req.body.liste_son_seed_reco)
    const playlist_id = req.body.playlist_id
    const SERVER_URL = process.env['SERVER_URL']
    res.render('recommandation', { erreur: null, playlist_id, liste_son_seed_reco, SERVER_URL });
    
  })


// Écoutez le port
app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});

