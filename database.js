const { MongoClient } = require('mongodb');
const uri = process.env['MONGODB_URI']
const crypto_manager = require('./crypto_manager.js');
const { Buffer } = require('buffer');

const client_utilisateur = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


function log(string) {
  console.log("[APP]" + string);
}

let db;

  client_utilisateur.connect()
  .then(() => {
    console.log('Connecté à MongoDB Atlas');
    db = client_utilisateur.db();
  })
  .catch(err => console.error('Erreur de connexion à MongoDB Atlas', err));


async function verifAuthLevel(req,res,str = "?") {
  if (req.session && req.session.utilisateur) {

    const usernameNormalized = req.session.utilisateur.username.toLowerCase();
    const utilisateur = await chercherUtilisateur(usernameNormalized);

    if(utilisateur){

      const authLevel = await getAuthLevelDb(usernameNormalized)

    if ( utilisateur.session_id === req.session.utilisateur.session_id )
   {

        return authLevel;


    } else {
      if (req.session.utilisateur) {
        log("[INTRU] " + req.session.utilisateur.username + " a éssayé d'accéder à /" + str + " avec un faux username");

      }
      else {
        log("[INTRU] Quelqu'un a éssayé d'accéder à /" + str + " avec un faux username");
      }
      return -1
      }

    } 

  return -1;
  }
  return -1;
}

async function getAuthLevelDb(username) {
  const u = await chercherUtilisateur(username)
  if(u)
  {
    return u.authLevel
  }
  return 0
}

async function getUserSpotifyId(username){

  const u = await chercherUtilisateur(username)
  if(u)
  {
    return u.id_spotify
  }
  return null
}

async function getUserMusicToken(username)
{
  
  
  const u = await chercherUtilisateur(username)

  if(!u){console.log("introuvable");return -1;}
  
  let res = [-1,-1,-1]
  if(u.spotify == -1 || u.spotify == 0){ res[0] = u.spotify }
  else
  {
    const data = JSON.parse(u.spotify);
    const bufferData1 = Buffer.from(data.access_token.data);
    const bufferData2 = Buffer.from(data.refresh_token.data);
    res[0] = {access_token : crypto_manager.decrypt(bufferData1),refresh_token : crypto_manager.decrypt(bufferData2) }
  }

  if(u.deezer == -1 || u.deezer == 0){ res[1] = u.deezer }
  else
  {
    const data = JSON.parse(u.deezer);
    const bufferData1 = Buffer.from(data.access_token.data);
    
    res[1] = {access_token : crypto_manager.decrypt(bufferData1) }
  }

  return res
  
}


// Fonction pour chercher un utilisateur dans la base de données
function chercherUtilisateur(username_) {
  let username = username_.toLowerCase();
  return db.collection('utilisateur').findOne({ username  });
};


async function updateUser(username, updateFields) {
  try {
    const result = await db.collection('utilisateur').updateOne({ username: username.toLowerCase()}, { $set: updateFields });
    if (result.modifiedCount === 1) {
      
      return true;
    } else {
      log(`Aucun utilisateur trouvé ou aucune mise à jour effectuée. : ` + username);
      return false;
    }
  } catch (error) {
    log(`Erreur lors de la mise à jour des champs de l'utilisateur : ${error}`);
    return false;
  }
}

async function createUser(username, hash, nom, prenom,email,authLevel = 0) {
  try {
    
    const result = await db.collection('utilisateur').insertOne({
      username: username.toLowerCase(),
      password: hash,
      nom : nom,
      prenom : prenom,
      email : email,
      authLevel : authLevel,
      spotify : -1,
      deezer : -1,
      apple_music : -1,
        tracks_refuse: [],
      playlist_historique: []
    });
   
    if (result.acknowledged) {
      
      return true;
    } else {
      log(`Échec de la création de l'utilisateur.`);
      return false;
    }
  } catch (error) {
    log(`Erreur lors de la création de l'utilisateur : ${error}`);
    return false;
  }
}

async function ajouterTrackPlaylistDB(username, playlistId, trackId) {
  try {
    const utilisateur = await chercherUtilisateur(username);
    if (!utilisateur) {
      log(`Utilisateur non trouvé : ${username} (ajouterSonPlaylistDB)`);
      return false;
    }

    // Vérifier si la playlist existe déjà
    const playlistIndex = utilisateur.tracks_refuse.findIndex(playlist => playlist.id === playlistId);
    if (playlistIndex === -1) {
      // La playlist n'existe pas, la créer
      const nouvellePlaylist = {
        id: playlistId,
        songs: [trackId]
      };

      utilisateur.tracks_refuse.push(nouvellePlaylist);
    } else {
      utilisateur.tracks_refuse[playlistIndex].songs.push(trackId);
    }

    const updateResult = await updateUser(username, { tracks_refuse: utilisateur.tracks_refuse });

    return updateResult ? true : -1;
  } catch (error) {
    log(`Erreur lors de l'ajout du son à la playlist : ${error} (ajouterSonPlaylistDB)`);
    return -1;
  }
}

async function getListeSonPlaylistDB(username, playlistId) {
  try {
    const utilisateur = await chercherUtilisateur(username);
    if (!utilisateur) {
      log(`Utilisateur non trouvé : ${username}`);
      return [];
    }

    // Rechercher la playlist par son ID
    const playlist = utilisateur.tracks_refuse.find(playlist => playlist.id === playlistId);
    if (!playlist) {
      //log(`Playlist non trouvée : ${playlistId}`);
      return [];
    }

    // Retourner la liste des ID de son de la playlist
    return playlist.songs;
  } catch (error) {
    log(`Erreur lors de la récupération de la liste des ID de son de la playlist : ${error}`);
    return [];
  }
}

async function ajouterIdPlaylistHistorique(username, playlistId, nbMaxHistorique = 3) {
  try {
    const utilisateur = await chercherUtilisateur(username);
    if (!utilisateur) {
      log(`Utilisateur non trouvé : ${username} (ajouterIdPlaylistHistorique)`);
      return false;
    }

    const playlist_historique = utilisateur.playlist_historique || [];

    const indexDansHistorique = playlist_historique.indexOf(playlistId);

    if (indexDansHistorique ==0){return true;}
    
    if (indexDansHistorique !== -1) {
        playlist_historique.splice(indexDansHistorique, 1);
    }

      playlist_historique.unshift(playlistId);

    if (playlist_historique.length > nbMaxHistorique) {
        playlist_historique.pop(); 
    }

    const updateResult = await updateUser(username, { playlist_historique });

    return updateResult ? true : -1;
  } catch (error) {
    log(`Erreur lors de l'ajout de l'ID de playlist à l'historique : ${error} (ajouterIdPlaylistHistorique)`);
    return -1;
  }
}

async function recupererIdPlaylistHistorique(username) {
  try {
    const utilisateur = await chercherUtilisateur(username);
    if (!utilisateur) {
      log(`Utilisateur non trouvé : ${username} (recupererHistorique)`);
      return [];
    }

    // Récupérer l'historique
    const historique = utilisateur.playlist_historique || [];

    return historique;
  } catch (error) {
    log(`Erreur lors de la récupération de l'historique : ${error} (recupererHistorique)`);
    return [];
  }
}


module.exports = {chercherUtilisateur,getAuthLevelDb,verifAuthLevel,updateUser,createUser,getUserMusicToken,ajouterTrackPlaylistDB,getListeSonPlaylistDB,ajouterIdPlaylistHistorique,recupererIdPlaylistHistorique,getUserSpotifyId}