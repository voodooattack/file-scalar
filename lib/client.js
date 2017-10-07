import { withRenderContext } from 'meteor/vulcan:lib';
import { fileUploadMiddleware } from './client/interface';

export * from './modules/index';

Meteor.startup(() => {
  withRenderContext(function (renderContext) {
    renderContext.apolloClient.networkInterface.use([fileUploadMiddleware]);
  });
});
