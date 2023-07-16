#!/usr/bin/env node

const { program } = require('commander');
require("@babel/register");

const mdLinks = require('./index.js').default;

program.version('1.0.0');

program
  .arguments('<path-to-file>')
  .option('--validate', 'Valida los links')
  .option('--stats', 'Muestra estadísticas de los links')
  .action((pathToFile, options) => {
    mdLinks(pathToFile, {
      validate: options.validate || false,
      stats: options.stats || false
    })
      .then((result) => {
        if (options.stats) {
          console.log(`Total: ${result.total}`);
          console.log(`Unique: ${result.unique}`);
          if (options.validate) {
            console.log(`Broken: ${result.broken}`);
          }
        } else if (options.validate) {
          result.forEach((link) => {
            console.log(`${link.file} ${link.href} ${link.ok} ${link.status} ${link.text}`);
          });
        } else {
          result.forEach((link) => {
            console.log(`${link.file} ${link.href} ${link.text}`);
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });

program.parse(process.argv);