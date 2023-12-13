const request = require('request');
const database = require('./database.js');


//playlistId to tracks id
async function getDeezerPlaylistTrack(playlist_id) {
  
    url = `https://api.deezer.com/playlist/${playlist_id}/tracks`
    const user_token = await database.getUserMusicToken(username)

    if( non_valide_deezer_user_token(user_token))
    {
      return(-1)
    }
    
    const playlistOptions = {
        url: `https://api.deezer.com/playlist/${playlist_id}`,
        qs: {
          'access_token': user_token
        }
      };
      request(playlistOptions, (error, response, body) => {
        if (error) {

          console.log("erreur ds getdeezerplaylisttrack :" + error);
          return reject(-1);
        }

        res = []
        const nb = JSON.parse(body).tracks.data;
        nb.forEach(async track => {
          res.push(track.id)
        });

        resolve(res)
        return
      })
}

//playlistId to info playlist
async function getDeezerPlaylist(playlistId, token) {

  const user_token = await database.getUserMusicToken(username)

  if( non_valide_deezer_user_token(user_token))
  {
    return(-1)
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      uri: `https://api.deezer.com/playlist/${playlistId}?access_token=${token}`,
      json: true
    };
    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      } else if (response.statusCode !== 200) {
        reject(new Error(`La récupération de la playlist a échoué avec le code d'erreur ${response.statusCode}`));
      } else {
        resolve(body);
      }
    });
  });
}

async function getRecentPlaylistsDeezer(accessToken, offset) {
  //alerte("acc -- " + accessToken)
  return new Promise((resolve, reject) => {


    const playlistOptions = {
      url: 'https://api.deezer.com/user/me/playlists',
      qs: {
        'access_token': accessToken,
        'limit': nb_prop_playlists,
        'index': offset

      }
    };
    request(playlistOptions, (error, response, body) => {
      if (error) {
        return reject(error);
      }

      const playlists = JSON.parse(body).data;
      //alerte("body -- " + body)
      resolve(playlists);
    });

  });
}