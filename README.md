# file-scalar

This package provides a `File` scalar data-type for your GraphQL schema. You can simply pass a browser `File` object as an argument to your mutations and the package takes care of the rest.

Your resolvers will receive a `Stream.Readable`, which they can then store or manipulate to their liking.

In addition, the stream passed to your resolvers will have these additional properties:

| Type   | Property         | Description                                  |
|--------|------------------|----------------------------------------------|
| string | filename         | The name of the file on the user's computer. |
| string | transferEncoding | The encoding used to transfer the file.      |
| string | mimeType         | The mime-type of the file. e.g. `image/png`  |
| string | fieldname        | The name of the field in the request.        |

## Fully functional example (with bonus image resizing)

In images/collection.js:

> Here we're using [Meteor-CollectionFS](https://github.com/CollectionFS/Meteor-CollectionFS) for file uploads and `cfs:graphicsmagick` to manipulate images.

```js

import * as path from 'path';
import { getSetting, GraphQLSchema } from 'meteor/vulcan:lib';
import DataLoader from 'dataloader';

function createThumbnail(fileObj, readStream, writeStream) {
  // Transform the image into a 64x64px thumbnail
  gm(readStream, fileObj.name()).resize('64', '64').stream().pipe(writeStream);
}

export const DEFAULT_UPLOADS_PATH = '~/uploads';

export const Images = new FS.Collection("images", {
  stores: [
    new FS.Store.FileSystem("original", {
      path: path.join(getSetting('uploadsPath', DEFAULT_UPLOADS_PATH), 'original')
    }),
    new FS.Store.FileSystem("thumb", {
      path: path.join(getSetting('uploadsPath', DEFAULT_UPLOADS_PATH), 'thumbs'),
      transformWrite: createThumbnail
    })
  ],
  filter: {
    allow: {
       contentTypes: ['image/*'] //allow only images in this FS.Collection
    }
  }
});

Images.loader = new DataLoader(async function (ids) {
  const documents = Images.find({ _id: { $in: ids } }).fetch();
  return ids.map(id => documents.find(doc => doc._id === id));
});

GraphQLSchema.addToContext({ Images });

```

In posts/schema.js:

```js
import { getComponent } from 'meteor/vulcan:lib';
import { Images } from '../images/collection';
import { Readable } from 'stream';
import SimpleSchema from 'simpl-schema';

function createInsertHandler(attribute, Collection) {
  return function (document, currentUser) {
    if (document[attribute] instanceof Readable) {
      const file = new FS.File();
      file.attachData(document[attribute], { type: document[attribute].mimeType });
      file.owner = currentUser._id;
      file.name(document[attribute].filename);
      file.type(document[attribute].mimeType);
      const { _id } = Collection.insert(file);
      return _id;
    }
    return document[attribute];
  }
}

function createEditHandler(attribute, Collection) {
  return function (modifiers, document, currentUser) {
    if (modifiers[ '$set' ] && modifiers[ '$set' ][ attribute ]) {
      const streamOrId = modifiers[ '$set' ][ attribute ];
      if (streamOrId instanceof Readable) {
        const file = new FS.File();
        file.attachData(streamOrId, { type: streamOrId.mimeType });
        file.owner = currentUser._id;
        file.name(streamOrId.filename);
        file.type(streamOrId.mimeType);
        const { _id } = Collection.insert(file);
        return _id;
      }
      return streamOrId;
    }
  }
}

const schema = {

  // ... default properties ...
  
  /**
  * This field will accept a file upload in mutations (new, edit) and resolve to an image 
  * URL in queries. Pretty neat, huh?  
  */
  featuredImage: {
    label: 'Featured Image',
    type: SimpleSchema.oneOf({ type: Object, blackbox: true }, String), /** IMPORTANT: SimpleSchema will coerce the type if we set it to `String`, so we have to add `Object` here. */
    viewableBy: ['guests'],
    insertableBy: ['members'],
    editableBy: ['members'],
    control: getComponent('Upload'), /** use the Upload form component (Provided by file-scalar) */
    /**
    * Here we save the file and return an ID in the Images collection.  
    */
    onInsert: createInsertHandler('featuredImage', Images),
    onEdit: createEditHandler('featuredImage', Images),
    /**
    * Resolve this field as a URL instead of an image ID. 
    * The URL will be accessible from the browser.
    */
    resolveAs: {
      fieldName: 'featuredImage',
      type: 'String',
      arguments: `
        # Image sizes allowed: 'original', 'thumb'
        size: String
      `,
      async resolver(document, args, context) {
        if (args.size && ['original', 'thumb'].indexOf(args.size) === -1)
                throw new Error('Invalid image size specified.');          
        const image = await context.Images.loader.load(document.featuredImage);
        if (image)
          return image.url({ store: args.size || 'original' });
      }
    }
  }
  // ...
}
```

## See also:

- [internal-graphql](https://gist.github.com/voodooattack/c4f7a261ea189ffb1894e9cb5e018587): Eliminate server-side fetches in Vulcan.js.
- [webtoken-session](https://gist.github.com/voodooattack/7a02881b0c762630160424f742b6f780): A server-side persistent session API for Vulcan.js.

## License

Copyright 2017, Abdullah Ali

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
