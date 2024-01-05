const express = require("express");
const router = express.Router();
const database = require("./database.js");
const deezer_client = require("./deezer_client.js");
const spotify_serveur = require("./spotify_serveur.js");
const spotify_client = require("./spotify_client.js");

router.use(async (req, res, next) => {
  const auth = await database.verifAuthLevel(req, res, "middlewareAPI");
  if (auth < 0) {
    res.json(0);
    console.log("[API] non connecté");
    return;
  } else {
    const usernameNormalized = req.session.utilisateur.username.toLowerCase();
    const music_token = await database.getUserMusicToken(usernameNormalized);
    if (
      music_token == -1 ||
      (music_token[0] == -1 &&
        music_token[0] == music_token[1] &&
        music_token[1] == music_token[2])
    ) {
      res.json(0);
      console.log(
        "[API] : Token musical introuvable pour " + usernameNormalized,
      );
      return;
    }
  }
  next();
});

router.get("/recherche", async (req, res) => {
  // Récupérer les paramètres de la requête

  const song_name = req.query.song_name;
  const offset = req.query.offset;
  const limit = req.query.limit !== undefined ? req.query.limit : 3;

  if (!song_name || !offset) {
    res.json(-1);
  } else {
    const donnee = await spotify_serveur.envoie_recherche_musique(
      song_name,
      offset,
      limit,
    );
    res.json(donnee);
  }
});

router.get("/creer_playlist", async (req, res) => {
  // Récupérer les paramètres de la requête

  const playlist_name = req.query.playlist_name;

  if (!playlist_name) {
    res.json(-1);
  } else {
    let token = await database.getUserMusicToken(
      req.session.utilisateur.username
    );

    //spotify
    if (token[0] != -1) 
    {
      let id_playlist = await spotify_client.createSpotifyPlaylist(playlist_name,req.session.utilisateur.username)
      if (id_playlist == -1) {
        res.json(-1);
        return;
      } else {
        res.json(id_playlist);
        return;
      }
    } else if (token[1] != -1) {
      //deezer
      let id_playlist = await deezer_client.createDeezerPlaylist(
        playlist_name,
        token[1].access_token,
        req.session.utilisateur.username,
      );
      if (id_playlist == -1) {
        res.json(-1);

        return;
      } else {
        res.json(id_playlist);
        return;
      }
    }
  }
});

router.get("/get_playlist_tracks_id", async (req, res) => {

  const playlist_id = req.query.playlist_id;
  if (!playlist_id) {
    res.json(-1);
    return
  } 
    let token = await database.getUserMusicToken(
      req.session.utilisateur.username
    );

    //spotify
    if (token[0] != -1) {

      let ids_spotify = await spotify_client.getSpotifyPlaylistTracksId(playlist_id,req.session.utilisateur.username)
      if (ids_spotify.length > 5) {
        const shuffledIds = shuffleArray(ids_spotify);
        ids_spotify = shuffledIds.slice(0, 5);
      }
      res.json(ids_spotify)
      return

      
    } else if (token[1] != -1) {
      //deezer
      let ids_deezer = await deezer_client.getDeezerPlaylistTracksId(playlist_id,token[1].access_token);
      
      if (ids_deezer.length > 5) {
        const shuffledIds = shuffleArray(ids_deezer);
        ids_deezer = shuffledIds.slice(0, 5);
      }

      var ids_spotify = await spotify_serveur.liste_d_to_s(ids_deezer)
      ids_spotify = ids_spotify.filter(element => element !== null);
      
      res.json(ids_spotify)
      return
    }
});

router.get("/add_tracks_playlist", async (req, res) => {

    const playlist_id = req.query.playlist_id;
    const tracks_id = req.query.tracks_id;
    if (!playlist_id || !tracks_id) {
      res.json(-1);
      return
    } 
      let token = await database.getUserMusicToken(
        req.session.utilisateur.username
      );
      //spotify
      if (token[0] != -1) {
        const ajoute = await spotify_client.addTracksToSpotifyPlaylist(tracks_id.split(','),playlist_id,req.session.utilisateur.username)
        if (ajoute == -1) {
          res.json(-1);
          return
        }
        res.json(true);
        return
        
      }else if (token[1] != -1) {
      var tracks_deezer_id = await spotify_serveur.liste_s_to_d(tracks_id.split(','))
      tracks_deezer_id = tracks_deezer_id.filter(element => element !== null);
      if(tracks_deezer_id == [])
      {
        res.json(-1); 
        console.log('[ERR]le son d\'id ' + tracks_id + ' n\'a pas pu etre traduit en id deezer dans la playlist d\'id ' + playlist_id + ' de ' + req.session.utilisateur.username);
        return
      }
      const ajoute = await deezer_client.addTracksToDeezerPlaylist(playlist_id,tracks_deezer_id,token[1].access_token)
      if(ajoute ==-1)
      {
        res.json(-1);
        return
      }
      res.json(true);
      return
    }
    
  })

router.get("/add_id_playlist_historique",async (req, res) => {
  const playlist_id = req.query.playlist_id;
  if (!playlist_id) {
    res.json(-1);
    return
  } 
  const ajoute = await database.ajouterIdPlaylistHistorique(
    req.session.utilisateur.username,playlist_id)
  if(ajoute == -1)
  {
    console.log('[ERR] la playlist d\'id ' + playlist_id + ' de l\'utilisateur ' + req.session.utilisateur.username + ' n\'a pas pu etre ajoute a la playlist historique')
  }
})

router.get("/ajouter_track_playlist_DB",async (req, res) => {
    const playlist_id = req.query.playlist_id;
    const track_id = req.query.track_id;

    
    if (!playlist_id || !track_id) {
      res.json(-1);
      return
    } 

    const ajoute = await database.ajouterTrackPlaylistDB(req.session.utilisateur.username,playlist_id,track_id)
    if(ajoute == -1)
    {
      res.json(-1);
      return
    }
    res.json(true);
    return
  })

router.get("/recommandation", async (req, res) => {
  // Récupérer les paramètres de la requête
  var liste_son_seed_reco = req.query.liste_son_seed_reco.split(",");
  const offset = req.query.offset;
  const limit = req.query.limit !== undefined ? req.query.limit : 50;
  const playlist_id = req.query.playlist_id;

  if (!liste_son_seed_reco || !offset || !playlist_id) {
    res.json(-1);
  } else {
    //enlever élements déjà refusés ou dans la playlist
    const sons_refuse = await database.getListeSonPlaylistDB(req.session.utilisateur.username,playlist_id);

    
    
    let donnee = await spotify_serveur.recommandation(
      liste_son_seed_reco,
      offset,
      limit,
    );
    
    //debug
    const elementsRefuses = donnee.filter(element => sons_refuse.includes(element));
    console.log("refusée : " + elementsRefuses);
    donnee = donnee.filter(element => !sons_refuse.includes(element));



    res.json(donnee);
  }
});
module.exports = router;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
