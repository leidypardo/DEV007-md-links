const fs = require('fs');
const path = require('path');
const axios = require('axios');
const marked = require('marked');

function extractLinks(fileContent, filePath) {
  const links = [];
  const renderer = new marked.Renderer();

  renderer.link = function (href, title, text) {
    links.push({
      href: href,
      text: text,
      file: filePath
    });
  };

  marked(fileContent, { renderer });
  return links;
}

function validateLink(link) {
  return axios.head(link.href)
    .then(response => {
      link.status = response.status;
      link.ok = response.status >= 200 && response.status < 300 ? 'ok' : 'fail';
      return link;
    })
    .catch(error => {
      link.status = error.response ? error.response.status : 'Unknown';
      link.ok = 'fail';
      return link;
    });
}

function mdLinks(filePath, options = { validate: false }) {
  return new Promise((resolve, reject) => {
    const resolvedPath = path.resolve(filePath);

    fs.readFile(resolvedPath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        const links = extractLinks(data, resolvedPath);

        if (options.validate) {
          const validatePromises = links.map(link => validateLink(link));
          Promise.all(validatePromises)
            .then(validatedLinks => resolve(validatedLinks))
            .catch(reject);
        } else {
          resolve(links);
        }
      }
    });
  });
}

module.exports = mdLinks;