


async function createSpotifyPlaylist(nom) {
  const user = client.users.cache.get(current_user_id);

  return new Promise(async (resolve, reject) => {
    const res = await getTok();
    if (res === false) {
      alerte("token plus valide, reset")
      firstMessage(true); return
    }
    else {
      const options = {
        method: "POST",
        url: "https://api.spotify.com/v1/me/playlists",
        headers: {
          'Authorization': `Bearer ${res[0]}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: nom
        })
      };

      request(options, (error, response, body) => {
        if (error) {
          console.error(error);
          reject(error)
        }

        const playlist = JSON.parse(body);
        const playlistId = playlist.id;
        alerte("✏️ " + user.username + " à creer une playlist spotify : " + nom)
        resolve(playlistId);
      });
    }
  })
}

async function addTrackToSpotifyPlaylist()
{

  let formattedTracks = songs.map(track => 'spotify:track:' + track);
  const options = {
    method: 'POST',
    url: `https://api.spotify.com/v1/playlists/${current_playlist_id}/tracks`,
    headers: {
      'Authorization': `Bearer ${res[0]}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uris: formattedTracks
    })
  };

  request(options, (error, response, body) => {
    if (error) {
      console.error(error);
      return;
    }

  });
}