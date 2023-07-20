import mdLinks from '../index.js';
import axios from 'axios';
import { validateLink } from '../index';
import { extractLinks,readDirRecursive } from '../index';
jest.mock('axios');
jest.mock('fs');
import path from 'path';
import fs from 'fs';

// Archivo de prueba: myModule.test.js


// Creamos mocks para las dependencias que interactúan con rutas, directorios y archivos
jest.mock('fs', () => ({
  readdir: jest.fn(),
  readFile: jest.fn()
}));

jest.mock('axios');



describe('validateLink', () => {
  it('debería validar un enlace correctamente', async () => {
    const link = { href: 'http://www.example.com' };
    const response = { status: 200 };
    axios.head.mockResolvedValue(response);

    const validatedLink = await validateLink(link);

    expect(validatedLink).toEqual({
      href: 'http://www.example.com',
      status: 200,
      ok: 'ok'
    });
    expect(axios.head).toHaveBeenCalledWith(link.href);
  });
});
describe('mdLinks', () => {
  it('debería obtener los enlaces de un archivo Markdown sin validar', async () => {
    const filePath = '/path/to/file.md';
    const fileContent = '[Enlace](http://www.example.com)';
    const mockedLstat = jest.fn((path, callback) => {
      const stats = { isFile: jest.fn(() => true), isDirectory: jest.fn(() => false) };
      callback(null, stats);
    });
    const mockedReadFile = jest.fn((path, options, callback) => {
      expect(path).toBe(filePath);
      expect(options).toBe('utf8');
      callback(null, fileContent);
    });
    require('fs').lstat = mockedLstat;
    require('fs').readFile = mockedReadFile;
    const expectedLinks = [
      { href: 'http://www.example.com', text: 'Enlace', file: filePath }
    ];

    const links = await mdLinks(filePath);

    expect(links).toEqual(expectedLinks);
    expect(mockedLstat).toHaveBeenCalledWith(filePath, expect.any(Function));
    expect(mockedReadFile).toHaveBeenCalledWith(filePath, 'utf8', expect.any(Function));
  });

  it('debería obtener los enlaces de un archivo Markdown y validarlos', async () => {
    const filePath = '/path/to/file.md';
    const fileContent = '[Enlace](http://www.example.com)';
    const mockedLstat = jest.fn((path, callback) => {
      const stats = { isFile: jest.fn(() => true), isDirectory: jest.fn(() => false) };
      callback(null, stats);
    });
    const mockedReadFile = jest.fn((path, options, callback) => {
      expect(path).toBe(filePath);
      expect(options).toBe('utf8');
      callback(null, fileContent);
    });
    const response = { status: 200 };
    axios.head.mockResolvedValue(response);
    require('fs').lstat = mockedLstat;
    require('fs').readFile = mockedReadFile;
    const expectedLinks = [
      { href: 'http://www.example.com', text: 'Enlace', file: filePath, status: 200, ok: 'ok' }
    ];

    const links = await mdLinks(filePath, { validate: true });

    expect(links).toEqual(expectedLinks);
    expect(mockedLstat).toHaveBeenCalledWith(filePath, expect.any(Function));
    expect(mockedReadFile).toHaveBeenCalledWith(filePath, 'utf8', expect.any(Function));
    expect(axios.head).toHaveBeenCalledWith('http://www.example.com');
  });

  it('debería obtener los enlaces de un directorio sin validar', async () => {
    const dirPath = '/path/to/directory';
    const file1 = { name: 'file1.md', isFile: jest.fn(() => true), isDirectory: jest.fn(() => false) };
    const file2 = { name: 'file2.md', isFile: jest.fn(() => true), isDirectory: jest.fn(() => false) };
    const files = [file1, file2];
    const mockedLstat = jest.fn((path, callback) => {
      const stats = { isFile: jest.fn(() => false), isDirectory: jest.fn(() => true) };
      callback(null, stats);
    });
    const mockedReadDir = jest.fn((path, options, callback) => callback(null, files));
    const mockedReadFile = jest.fn((path, options, callback) => {
      if (path === '/path/to/directory/file1.md') {
        callback(null, '[Link 1](http://www.link1.com)');
      } else if (path === '/path/to/directory/file2.md') {
        callback(null, '[Link 2](http://www.link2.com)');
      }
    });
    require('fs').lstat = mockedLstat;
    require('fs').readdir = mockedReadDir;
    require('fs').readFile = mockedReadFile;
    const expectedLinks = [
      { href: 'http://www.link1.com', text: 'Link 1', file: '/path/to/directory/file1.md' },
      { href: 'http://www.link2.com', text: 'Link 2', file: '/path/to/directory/file2.md' }
    ];

    const links = await mdLinks(dirPath);

    expect(links).toEqual(expectedLinks);
    expect(mockedLstat).toHaveBeenCalledWith(dirPath, expect.any(Function));
    expect(mockedReadDir).toHaveBeenCalledWith(dirPath, { withFileTypes: true }, expect.any(Function));
    expect(mockedReadFile).toHaveBeenCalledWith('/path/to/directory/file1.md', 'utf8', expect.any(Function));
    expect(mockedReadFile).toHaveBeenCalledWith('/path/to/directory/file2.md', 'utf8', expect.any(Function));
  });
});
