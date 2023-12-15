const express = require('express');
const router = express.Router();
const spotify = require('./spotify_serveur.js');
const index = require('./index.js');
  
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