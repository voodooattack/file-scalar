Package.describe({
  name: 'file-scalar',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'Adds a File scalar type to Vulcan.js',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Npm.depends({
  'recursive-iterator': '3.3.0',
  'async-busboy': '0.6.2',
  'brackets2dots': '1.1.0',
  'object-path': '0.11.4',
  'react-dropzone': '4.1.3',
});

Package.onUse(function(api) {
  api.versionsFrom('1.5.1');
  api.use([
    'ecmascript',
    'vulcan:lib'
  ]);
  api.mainModule('lib/server.js', ['server']);
  api.mainModule('lib/client.js', ['client']);
});

