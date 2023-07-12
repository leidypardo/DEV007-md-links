// index.js

const fs = require('fs');
const marked = require('marked');
const axios = require('axios');

function mdLinks(markdownFile) {
  return new Promise((resolve, reject) => {
    // Leer el archivo Markdown
    fs.readFile(markdownFile, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      // Analizar el Markdown a HTML
      const html = marked(data);

      // Encontrar todos los enlaces en el HTML
      const regex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/g;
      const links = [];
      let match;
      while ((match = regex.exec(html))) {
        links.push(match[2]);
      }

      // Realizar solicitudes HTTP para verificar los enlaces
      const linkPromises = links.map((link) =>
        axios.get(link).catch((error) => ({
          status: error.response ? error.response.status : 'ERROR',
          url: link,
        }))
      );

      // Obtener los resultados de las solicitudes HTTP
      Promise.all(linkPromises)
        .then((results) => {
          // Generar arreglo de objetos con información de los enlaces
          const linkInfo = results.map((result) => ({
            url: result.url,
            status: result.status === 200 ? 'OK' : 'FAIL',
          }));

          resolve(linkInfo);
        })
        .catch((error) => {
          reject(error);
        });
    });
  });
}

module.exports = mdLinks;
