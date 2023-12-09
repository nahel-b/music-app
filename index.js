const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const database = require('./database.js');
const traitement_image = require('./traitement_image.js');
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

    res.render('accueil', { username: req.session.utilisateur.username });
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

// Écoutez le port
app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});


