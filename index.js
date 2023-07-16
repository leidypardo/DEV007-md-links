import fs from 'fs';
import path from 'path';
import axios from 'axios';
import marked from 'marked';

function extractLinks(fileContent, filePath) {
  const links = [];
  const renderer = new marked.Renderer();

  renderer.link = (href, title, text) => {
    links.push({
      href,
      text,
      file: filePath
    });
  };

  marked(fileContent, { renderer });
  return links;
}

function validateLink(link) {
  return axios
    .head(link.href)
    .then((response) => {
      link.status = response.status;
      link.ok = response.status >= 200 && response.status < 300 ? 'ok' : 'fail';
      return link;
    })
    .catch((error) => {
      if (error.response) {
        link.status = error.response.status;
      } else {
        link.status = error.code === 'ENOTFOUND' ? 404 : 'Unknown';
      }
      link.ok = 'fail';
      return link;
    });
}

function readDirRecursive(dirPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
      if (err) {
        reject(err);
      } else {
        const filePromises = [];

        files.forEach(file => {
          const filePath = path.join(dirPath, file.name);

          if (file.isFile() && path.extname(filePath) === '.md') {
            const filePromise = new Promise((resolve, reject) => {
              fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                  reject(err);
                } else {
                  const links = extractLinks(data, filePath);
                  resolve(links);
                }
              });
            });

            filePromises.push(filePromise);
          } else if (file.isDirectory()) {
            const dirPromise = readDirRecursive(filePath);
            filePromises.push(dirPromise);
          }
        });

        Promise.all(filePromises)
          .then(results => {
            const allLinks = results.flat();
            resolve(allLinks);
          })
          .catch(reject);
      }
    });
  });
}

export default function mdLinks(filePath, options = { validate: false }) {
  return new Promise((resolve, reject) => {
    let resolvedPath = filePath;

    // Verifica si la ruta es absoluta y la convierte en absoluta si no lo es
    if (!path.isAbsolute(resolvedPath)) {
      resolvedPath = path.resolve(filePath);
    }

    fs.lstat(resolvedPath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        if (stats.isFile() && path.extname(resolvedPath) === '.md') {
          // La ruta es un archivo individual
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
        } else if (stats.isDirectory()) {
          // La ruta es un directorio
          readDirRecursive(resolvedPath)
            .then(links => {
              if (options.validate) {
                const validatePromises = links.map(link => validateLink(link));
                Promise.all(validatePromises)
                  .then(validatedLinks => resolve(validatedLinks))
                  .catch(reject);
              } else {
                resolve(links);
              }
            })
            .catch(reject);
        } else {
          reject(new Error('La ruta especificada no es un archivo ni un directorio válido.'));
        }
      }
    });
  });
}