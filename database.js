const { MongoClient } = require('mongodb');
const uri = process.env['MONGODB_URI']
console.log(uri)
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


async function verifAuthLevel(req,res,str = "?")
{
  if (req.session.utilisateur) {

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

async function getAuthLevelDb(username)
{
  const u = await chercherUtilisateur(username)
  if(u)
  {
    return u.authLevel
  }
  return 0
}

// Fonction pour chercher un utilisateur dans la base de données
function chercherUtilisateur(username) {
  return db.collection('utilisateur').findOne({ username });
}


async function updateUser(username, updateFields) {
  try {
    const result = await db.collection('utilisateur').updateOne({ username: username.toLowerCase()}, { $set: updateFields });
    if (result.modifiedCount === 1) {
      log(`Champs mis à jour avec succès pour l'utilisateur.`);
      return true;
    } else {
      log(`Aucun utilisateur trouvé ou aucune mise à jour effectuée.`);
      return false;
    }
  } catch (error) {
    log(`Erreur lors de la mise à jour des champs de l'utilisateur : ${error}`);
    return false;
  }
}

async function createUser(username, hash, nom, prenom,authLevel = 0) {
  try {
    
    const result = await db.collection('utilisateur').insertOne({
      username: username.toLowerCase(),
      password: hash,
      nom : nom,
      prenom : prenom,
      authLevel : authLevel
    });
   
    console.log(result)
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



module.exports = {chercherUtilisateur,getAuthLevelDb,verifAuthLevel,updateUser,createUser}