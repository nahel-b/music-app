const request = require('request');
const jpeg = require('jpeg-js');

function getImageData(imageUrl) {
  return new Promise((resolve, reject) => {
    request.get(imageUrl, { encoding: null }, (error, response, body) => {
      if (error) {
        reject(`Erreur lors de la récupération de l'image: ${error}`);
        return;
      }

      if (response.statusCode !== 200) {
        reject(`Erreur lors de la récupération de l'image. Code de statut: ${response.statusCode}`);
        return;
      }

      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/jpeg')) {
        reject('Le contenu ne semble pas être une image JPEG valide.');
        return;
      }

      try {
        const rawImageData = jpeg.decode(body);
        resolve(rawImageData);
      } catch (decodeError) {
        reject(`Erreur lors du décodage de l'image: ${decodeError}`);
      }
    });
  });
}

async function processImage(imageUrl) {
  try {
    const rawImageData = await getImageData(imageUrl);

    const startX = 0;
    const startY = Math.floor(rawImageData.height / 2);
    const width = rawImageData.width;
    const height = Math.floor(rawImageData.height / 2);
    const imageData = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
      const startIdx = (startY + y) * rawImageData.width * 4;
      const endIdx = startIdx + width * 4;
      imageData.set(rawImageData.data.subarray(startIdx, endIdx), y * width * 4);
    }

    let totalRed = 0;
    let totalGreen = 0;
    let totalBlue = 0;

    for (let i = 0; i < imageData.length; i += 4) {
      totalRed += imageData[i];
      totalGreen += imageData[i + 1];
      totalBlue += imageData[i + 2];
    }

    const averageRed = totalRed / (imageData.length / 4);
    const averageGreen = totalGreen / (imageData.length / 4);
    const averageBlue = totalBlue / (imageData.length / 4);

    return [
      averageRed,
      averageGreen,
      averageBlue,
    ];
  } catch (error) {
    console.error(`Erreur lors du traitement de l'image: ${error}`);
    return -1;
  }
}

async function isTextReadable (imageUrl, distanceMin = 60){
  const pix = await processImage(imageUrl)

  const distanceToWhite = Math.sqrt((pix[0] -255) ** 2 + (pix[1] -255)  ** 2 + (pix[2] -255)  ** 2);


  return distanceToWhite > distanceMin;
};




module.exports = {isTextReadable}