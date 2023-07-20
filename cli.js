#!/usr/bin/env node

//const { program } = require('commander');
//require("@babel/register");

const mdLinks = require('md-links-tatakathe').default;
//consultar en la terinal los arumentos que envia el usuario
const args = process.argv.slice(2);
const filePath = args[0];
const options = {
  validate: args.includes('--validate'),
  stats: args.includes('--stats')
};

// Invoca la función mdLinks con los argumentos y opciones proporcionados
mdLinks(filePath, options)
  .then(links => {
    if (options.stats) {
      const totalLinks = links.length;
      //verifica los links que no son repetidos con set que no valida los repetido 
      const uniqueLinks = new Set(links.map(link => link.href)).size;//size longitud total
      console.log(`Total: ${totalLinks}`);
      console.log(`Unique: ${uniqueLinks}`);

      if (options.validate) {
        const okLinks = links.filter(link => link.status === 200);
        const brokenLinks = links.filter(link => link.status === 404);

        console.log(`okLinks (${okLinks.length}):`);
        okLinks.forEach(link => {
          console.log(`${link.file} ${link.href} ${link.ok} ${link.status} ${link.text}`);
        });

        console.log(`Broken Links (${brokenLinks.length}):`);
        brokenLinks.forEach(link => {
          console.log(`${link.file} ${link.href} ${link.ok} ${link.status} ${link.text}`);
        });
      }
    } else if(options.validate) {
      links.forEach((link) => {
        console.log(`${link.file} ${link.href} ${link.ok} ${link.status} ${link.text}`);
      });
    }else{
      links.forEach((link) => {
        console.log(`${link.file} ${link.href}`);
      });
    }
  })
  .catch(error => {
    console.error('Error:', error.message);
  });