const fs = require('fs');
const marked = require('marked');
const axios = require('axios');

const markdownFile = 'C:/Users/diego.a.ruiz.acevedo/Desktop/Dojo/links.md';

const args = process.argv.slice(2); // Obtener los argumentos de línea de comandos

// Verificar si se proporcionó el argumento --validate o --status
const validateMode = args.includes('--validate');
const statusMode = args.includes('--status');

// Leer el archivo Markdown
fs.readFile(markdownFile, 'utf8', (err, data) => {
  if (err) {
    console.error(err);
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

  if (validateMode) {
    // Modo --validate: Realizar solicitudes HTTP para verificar los enlaces
    const linkPromises = links.map((link) =>
      axios
        .get(link)
        .then((response) => ({
          url: link,
          status: response.status,
          statusText: 'ok',
        }))
        .catch((error) => ({
          url: link,
          status: error.response ? error.response.status : 'fail',
          statusText: 'fail',
        }))
    );

    // Obtener los resultados de las solicitudes HTTP
    Promise.all(linkPromises).then((results) => {
      // Imprimir los resultados
      results.forEach((result) => {
        console.log(`${result.url} - ${result.statusText}`);
      });
    });
  } else if (statusMode) {
    // Modo --status: Generar estadísticas
    const totalLinks = links.length;
    console.log('Estadísticas:');
    console.log(`- Total de enlaces: ${totalLinks}`);
  } else {
    // Modo por defecto: Mostrar mensaje de uso
    console.log('Uso:');
    console.log('node index.js --validate');
    console.log('node index.js --status');
  }
});
