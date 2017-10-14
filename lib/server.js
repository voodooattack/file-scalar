export * from './modules/index';

import { GraphQLError } from 'graphql';
import { webAppConnectHandlersUse, GraphQLSchema } from 'meteor/vulcan:lib';
import objectPath from 'object-path';
import brackets2Dots from 'brackets2dots';
import asyncBusboy from 'async-busboy';

function isUpload(req) {
  return req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data');
}

async function graphqlUploadMiddleware(req, res, next) {
  try {
    if (!isUpload(req)) {
      return next();
    }
    const { files, fields } = await asyncBusboy(req);

    files.forEach((file) => {
      objectPath.set(fields, brackets2Dots(file.fieldname), file);
    });
    req.body = fields.data;
  } catch(e) {
    return next(e);
  }
  return next();
}

Meteor.startup(() => {
  webAppConnectHandlersUse('graphql-upload-middleware', '/graphql', graphqlUploadMiddleware, { order: 1 });
});

GraphQLSchema.addSchema(`
  # A file upload.
  scalar File
`);

GraphQLSchema.addResolvers({
  File: {
    __serialize(value) { return value; },
    __parseValue(value) { return value; },
    __parseLiteral(value) {
      // Maybe support base64 here?
      throw new GraphQLError('File literals are not allowed.', [value]);
    }
  }
});
