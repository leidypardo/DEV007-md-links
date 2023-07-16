"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = mdLinks;
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _axios = _interopRequireDefault(require("axios"));
var _marked = _interopRequireDefault(require("marked"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function extractLinks(fileContent, filePath) {
  var links = [];
  var renderer = new _marked["default"].Renderer();
  renderer.link = function (href, title, text) {
    links.push({
      href: href,
      text: text,
      file: filePath
    });
  };
  (0, _marked["default"])(fileContent, {
    renderer: renderer
  });
  return links;
}
function validateLink(link) {
  return _axios["default"].head(link.href).then(function (response) {
    link.status = response.status;
    link.ok = response.status >= 200 && response.status < 300 ? 'ok' : 'fail';
    return link;
  })["catch"](function (error) {
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
  return new Promise(function (resolve, reject) {
    _fs["default"].readdir(dirPath, {
      withFileTypes: true
    }, function (err, files) {
      if (err) {
        reject(err);
      } else {
        var filePromises = [];
        files.forEach(function (file) {
          var filePath = _path["default"].join(dirPath, file.name);
          if (file.isFile() && _path["default"].extname(filePath) === '.md') {
            var filePromise = new Promise(function (resolve, reject) {
              _fs["default"].readFile(filePath, 'utf8', function (err, data) {
                if (err) {
                  reject(err);
                } else {
                  var links = extractLinks(data, filePath);
                  resolve(links);
                }
              });
            });
            filePromises.push(filePromise);
          } else if (file.isDirectory()) {
            var dirPromise = readDirRecursive(filePath);
            filePromises.push(dirPromise);
          }
        });
        Promise.all(filePromises).then(function (results) {
          var allLinks = results.flat();
          resolve(allLinks);
        })["catch"](reject);
      }
    });
  });
}
function mdLinks(filePath) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    validate: false
  };
  return new Promise(function (resolve, reject) {
    var resolvedPath = filePath;

    // Verifica si la ruta es absoluta y la convierte en absoluta si no lo es
    if (!_path["default"].isAbsolute(resolvedPath)) {
      resolvedPath = _path["default"].resolve(filePath);
    }
    _fs["default"].lstat(resolvedPath, function (err, stats) {
      if (err) {
        reject(err);
      } else {
        if (stats.isFile() && _path["default"].extname(resolvedPath) === '.md') {
          // La ruta es un archivo individual
          _fs["default"].readFile(resolvedPath, 'utf8', function (err, data) {
            if (err) {
              reject(err);
            } else {
              var links = extractLinks(data, resolvedPath);
              if (options.validate) {
                var validatePromises = links.map(function (link) {
                  return validateLink(link);
                });
                Promise.all(validatePromises).then(function (validatedLinks) {
                  return resolve(validatedLinks);
                })["catch"](reject);
              } else {
                resolve(links);
              }
            }
          });
        } else if (stats.isDirectory()) {
          // La ruta es un directorio
          readDirRecursive(resolvedPath).then(function (links) {
            if (options.validate) {
              var validatePromises = links.map(function (link) {
                return validateLink(link);
              });
              Promise.all(validatePromises).then(function (validatedLinks) {
                return resolve(validatedLinks);
              })["catch"](reject);
            } else {
              resolve(links);
            }
          })["catch"](reject);
        } else {
          reject(new Error('La ruta especificada no es un archivo ni un directorio válido.'));
        }
      }
    });
  });
}