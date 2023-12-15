const express = require('express');
const router = express.Router();
const spotify = require('./spotify_serveur.js');
const database = require('./database.js');
const deezer_client = require('./deezer_client.js');


router.use(async (req, res, next) => {
  const auth = await database.verifAuthLevel(req, res, "middlewareAPI");
  if (auth < 0) {
    res.json(0);
    console.log('[API] non connecté')
    return;
  }
  else
  {
    const usernameNormalized = req.session.utilisateur.username.toLowerCase();
    const music_token = await database.getUserMusicToken(usernameNormalized)
    if( music_token == -1 || (music_token[0] == -1) && (music_token[0] == music_token[1]) && (music_token[1] == music_token[2]) )
    {
      res.json(0);
      console.log('[API] : Token musical introuvable pour ' + usernameNormalized )
      return
    }
  }
  next();
});
  
router.get('/recherche', async (req, res) => {
  // Récupérer les paramètres de la requête

  const song_name = req.query.song_name;
  const offset = req.query.offset;
  const limit = req.query.limit !== undefined ? req.query.limit : 3;

  if (!song_name || !offset) 
  {
    res.json(-1);
  }
  else {
    const donnee = await spotify.envoie_recherche_musique(song_name, offset,limit) 
    res.json(donnee);
  }
});

router.get('/creer_playlist', async (req, res) => {
  // Récupérer les paramètres de la requête

  const playlist_name = req.query.playlist_name;

  if (!playlist_name) 
  {
    res.json(-1);
  }
  else {
    
    let token = await database.getUserMusicToken(req.session.utilisateur.username)

      //spotify
      if(token[0] != -1)
      {

      } 
      else if(token[1] != -1) //deezer
      {
        let id_playlist = await deezer_client.createDeezerPlaylist(playlist_name,token[1].access_token,req.session.utilisateur.username)
        if(id_playlist == -1)
        {
          res.json(-1);
          
          return
        }
        else
        {
          res.json(id_playlist);
          return
        }
      }
    
  }
});

router.get('/recommandation', async (req, res) => {
  // Récupérer les paramètres de la requête
  const song_name = req.query.song_name;
  const offset = req.query.offset;

  if (!song_name || !offset) 
  {
    res.json(-1);
  }
  else {
    const donnee = await spotify.envoie_recherche_musique(song_name, offset) 
    res.json(donnee);
  }
});
module.exports = router;