const fs = require("fs");
const crypto = require("crypto");

const algorithm = "aes-256-cbc";
const key = process.env['clef'];
const iv = Buffer.from("3d4be42df33cc6a030aa54df2e144920", "hex");

function encrypt(buffer) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    return Buffer.concat([cipher.update(buffer, null), cipher.final()]);
}

function decrypt(buffer) {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
}

// Function to store token in encrypted form
async function storeToken(id, token,refresh_token,platform, name) {

  let data = {};
  try {
    const file = await fs.promises.readFile("tokens.json");
    data = JSON.parse(file);
  } catch (err) {
    console.log("erreur ds stortoken :=" + err)
  }
  if (!data[id]) {
    data[id] = {};
    }
  data[id]["name"] = name;
  data[id]["platform"] = platform;
  data[id]["token"] = encrypt(token).toString("hex");
  data[id]["refresh_token"] = encrypt(refresh_token).toString("hex");

  await fs.promises.writeFile("tokens.json", JSON.stringify(data));


}

async function getToken(id) {
  try {
    const data = await fs.promises.readFile("tokens.json", "utf8");
    const encryptedToken = JSON.parse(data)[id]["token"];
    const encryptedRefreshToken = JSON.parse(data)[id]["refresh_token"];
    const platform = JSON.parse(data)[id]["platform"];
    const name = JSON.parse(data)[id]["name"];
    if (!encryptedToken) {
      console.log('a')
      return -1;
    }
    b = Buffer.from(encryptedToken, "hex");
    c = Buffer.from(encryptedRefreshToken, "hex");
    return [decrypt(b),platform,decrypt(c),name];
  } catch (error) {
    console.error("erreur ds getToken (pas enregistré)");
    return -1;
  }
}

module.exports = { encrypt,decrypt}