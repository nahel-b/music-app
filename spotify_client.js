const request = require('request');
const database = require('./database.js');
const spotify_client_id = process.env['spotify_client_id']
const spotify_client_secret = process.env['spotify_client_secret']


async function refresh_user_spotify_token(username){

  var refresh_token = await getUserMusicToken(username);
  refresh_token = refresh_token[0].refresh_token

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'))
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions,async function(error, response, body) {
    if (!error && response.statusCode === 200) {
      
      const tok = {access_token : crypto_manager.encrypt(body.access_token), refresh_token : crypto_manager.encrypt(body.refresh_token)}
      let resp = await database.updateUser(username, {spotify : JSON.stringify(tok)})
      return resp
    }
    else 
    {
      console.log("[ERR] impossible de refresh le token spotify de " + username);
      return false
    }
  });
  
}

async function get_user_token(username){

  var refresh_token = await database.getUserMusicToken(username);
  return refresh_token[0].access_token
  
}

async function requete(url, body, method, username, qs = {}, nb_essaie = 1) {
  
let user_token = await get_user_token(username);
const options = {
  method: method,
  url: url,
  headers: {
    'Authorization': `Bearer ${user_token}`,
    'Content-Type': 'application/json'
  },
  qs: method === 'GET' ? qs : {}, // Utilisez 'qs' pour les requêtes GET
  body: method !== 'GET' ? body : undefined, // Utilisez 'body' pour les requêtes POST et PUT
  json: true
};

  return new Promise((resolve, reject) => {
  request(options, async (error, response, body) => {
    //console.log("rep=" + JSON.stringify(response))
    if (error) {
      if(nb_essaie >0)
      {
        await refresh_user_spotify_token()
        let rep = await requete(url,body,nb_essaie-1)
        return resolve(rep)
      }
      console.error(error);
      return resolve(-1);
    }
    return resolve(body)
  });
  })

}

async function createSpotifyPlaylist(nom,username) {
  
  let url = "https://api.spotify.com/v1/me/playlists"
  let body = { name: nom }
  let resp = await requete(url, body, "POST", username)
  if (resp == -1){console.log("[ERR] erreur lors de la création d'une playlist");return -1;}
  return resp.id;

}

async function addTracksToSpotifyPlaylist(tracks_id, playlist_id,username) {

  let formattedTracks = tracks_id.map(track => 'spotify:track:' + track);
  
  let url = `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`
  let body = JSON.stringify({ uris: formattedTracks })
  let resp = await requete(url,body,'POST',username)
  if (resp === -1) 
  {
    console.log("[ERR] erreur lors de l'ajout des tracks");
    return -1;
  }
  return true;
}

async function getRecentSpotifyPlaylists(username){

  let url = 'https://api.spotify.com/v1/me/playlists'
  //let qs = {'limit': nb_prop_playlists,'offset': offset }
  let resp = await requete(url,null,"GET",username,{})

  return resp.items
  
}

async function getSpotifyPlaylistTracksId(){}

async function addTracksToSpotifyPlaylist(){}

async function getSpotifyPlaylist(){}

module.exports ={getRecentSpotifyPlaylists,createSpotifyPlaylist,getSpotifyPlaylistTracksId,addTracksToSpotifyPlaylist,getSpotifyPlaylist}