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

async function getUserMusicToken(username)
{
  
  
  const u = await chercherUtilisateur(username)

  if(!u){return -1;}
  
  res = [-1,-1,-1]
  if(u.spotify == -1 || u.spotify == 0){ res[0] = u.spotify }
  else
  {
    const data = JSON.parse(u.spotify);
    const bufferData1 = Buffer.from(data.access_token.data);
    const bufferData2 = Buffer.from(data.refresh_token.data);
    res[0] = {access_token : crypto_manager.decrypt(bufferData1),refresh_token : crypto_manager.decrypt(bufferData2) }
  }

  if(u.deezer == -1 || u.deezer == 0){ res[0] = u.deezer }
  else
  {
    const data = JSON.parse(u.deezer);
    const bufferData1 = Buffer.from(data.access_token.data);
    
    res[1] = {access_token : crypto_manager.decrypt(bufferData1) }
  }

  return res
  
}


// Fonction pour chercher un utilisateur dans la base de données
function chercherUtilisateur(username) {
  return db.collection('utilisateur').findOne({ username });
}


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
      apple_music : -1
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



module.exports = {chercherUtilisateur,getAuthLevelDb,verifAuthLevel,updateUser,createUser,getUserMusicToken}