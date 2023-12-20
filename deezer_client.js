const request = require('request');
const database = require('./database.js');

async function non_valide_deezer_user_token(token)
{
  if(token == null || token == "-1" ||token == "0")
  {
    return true;
  }
  return new Promise((resolve, reject) => {
    
    const reqOpt = {
      url: 'https://api.deezer.com/user/me/',
      qs: {
        'access_token': token
      }
    };
    
    request(reqOpt, (error, response, body) => {

      if (error) {
        console.log("errr=" + error);
        return resolve(true);
      }
      return resolve(false);
    });

  });

  
}
//playlistId to tracks id
async function getDeezerPlaylistTracksId(playlist_id, user_token) {
    return new Promise( async (resolve, reject) => {
        const nonvalide = await non_valide_deezer_user_token(user_token);

        if (nonvalide) {
            reject(-1);
        }

        const playlistOptions = {
            url: `https://api.deezer.com/playlist/${playlist_id}`,
            qs: {
                'access_token': user_token,
            },
        };

        request(playlistOptions, (error, response, body) => {
            if (error) {
                console.log("erreur ds getdeezerplaylisttrack :" + error);
                reject(-1);
            }

            const tracks = JSON.parse(body).tracks.data;
            const trackIds = tracks.map(track => track.id) ? tracks.map(track => track.id) : [];
            
            
            resolve(trackIds);
        });
    });
}

//playlistId to info playlist
async function getDeezerPlaylist(playlistId,user_token) {

  

  const nonvalide = await non_valide_deezer_user_token(user_token)
  if( nonvalide)
  {
    return(-1)
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      uri: `https://api.deezer.com/playlist/${playlistId}?access_token=${user_token}`,
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

async function getRecentDeezerPlaylists(username) {
  //alerte("acc -- " + accessToken)

  let user_token = await database.getUserMusicToken(username)
  user_token = user_token[1].access_token
  const nonvalide = await non_valide_deezer_user_token(user_token)

  if( nonvalide)
  {
    return(-1)
  }
  
  return new Promise((resolve, reject) => {


    const playlistOptions = {
      url: 'https://api.deezer.com/user/me/playlists',
      qs: {
        'access_token': user_token,
        'limit' : 50

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

async function createDeezerPlaylist(nom,access_token,username) {

  
  const nonvalide = await non_valide_deezer_user_token(access_token)

  if( nonvalide)
  {
    return(-1)
  }
  
  return new Promise(async (resolve, reject) => {
      const options = {
        method: "POST",
        url: "https://api.deezer.com/user/me/playlists",
        qs: {
          'access_token': access_token,
          'title': nom
        }

      };
    
      request(options, async (error, response, body) => {
        if (error) {
          console.error("Erreur dans creer playlistDeezer=" + error);
          resolve(-1)
        }
        const p = await JSON.parse(body);
        
        const playlistId = p.id;
        console.log("[APP]✏️ " + username + " à creer une playlist deezer ("+ playlistId +") : " + nom)
        resolve(playlistId);
      });
    
  })
}

module.exports ={getRecentDeezerPlaylists,createDeezerPlaylist,getDeezerPlaylistTracksId}