import fs from 'fs'; // Permite leer los archivos.
import path from 'path'; // para manipular rutas de archivos.
import axios from 'axios'; //  para hacer solicitudes HTTP.
import marked from 'marked'; // analizar y covertir contenido Markdown a html.


export function extractLinks(fileContent, filePath) {
  const links = [];
  //puedo modificar como se procesan los elementos del md con marked.Renderer()
  const renderer = new marked.Renderer();
 //guardar los enlaces encontrados
  renderer.link = (href, title, text) => {
    links.push({
      href,
      text,
      file: filePath
    });
  };
//analiza el md con los elementos personalizados (text, file, href)
  marked(fileContent, { renderer });
  return links;
}

export function validateLink(link) {
  return axios
  //consulta que devuelve solo encabezado, la info de la pagina
    .head(link.href)
    .then((response) => {
      link.status = response.status
      //operador ternario
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
//funcion para leer directorio
export function readDirRecursive(dirPath) {
  return new Promise((resolve, reject) => {
    //lee la ruta del archivo y se pasa el argumento withFileTypes para que me de la informacion de cada elemento del directorio
    fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
      if (err) {
        reject(err);
      } else {
        const filePromises = [];

        files.forEach(file => {
          //uno la ruta del direct0rio con el nombre del archivo md
          const filePath = path.join(dirPath, file.name);
//valida si es md y si es uno solo o varios
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
//almacena los links 
            filePromises.push(filePromise);
            //si sigue siendo un directorio modifica la ruta agregando la nueva carpeta hasta encontrar un md
          } else if (file.isDirectory()) {
            const dirPromise = readDirRecursive(filePath);
            filePromises.push(dirPromise);
          }
        });

        Promise.all(filePromises)
          .then(results => {
            //une en un solo array todos los links encontrados 
            const allLinks = results.flat(); //.flat une todos lo elementos en uns solo array
            resolve(allLinks);
          })
          .catch(reject);
      }
    });
  });
}

//funcion para analizar los links de una ruta o directorio
export default function mdLinks(filePath, options = { validate: false }) {
  return new Promise((resolve, reject) => {
    let resolvedPath = filePath;

    // con la libreria path Verifica si la ruta NO es absoluta y la convierte en absoluta si no lo es
    if (!path.isAbsolute(resolvedPath)) {
      resolvedPath = path.resolve(filePath);
    }
// libreria fs y metodo lstat puedo obtener informcion de un archivo
    fs.lstat(resolvedPath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        //verifica si es un solo archivo y si es md
        if (stats.isFile() && path.extname(resolvedPath) === '.md') {
          fs.readFile(resolvedPath, 'utf8', (err, data) => {
            if (err) {
              reject(err);
            } else {
              const links = extractLinks(data, resolvedPath);

              if (options.validate) {
                //valida todos los links con .map y entra a la funcion de validatelink
                const validatePromises = links.map(link => validateLink(link));
                Promise.all(validatePromises)
                //cuando todas las promesas se resuelvan devuelve los links validados
                  .then(validatedLinks => resolve(validatedLinks))
                  .catch(reject);
              } else {
                //cuando no se envia la opcion --validate, nos devuelve los links como estan sin validar
                resolve(links);
              }
            }
          });
           // La ruta es un directorio
        } else if (stats.isDirectory()) {
          readDirRecursive(resolvedPath)
            .then(links => {
              if (options.validate) {
                //valida todos los links con .map y entra a la funcion de validatelink
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
