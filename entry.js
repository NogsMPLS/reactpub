'use strict';

const React = require('react');
const ReactDom = require('react-dom');
const ReactDomServer = require('react-dom/server');
const ReactRouter = require('react-router');
const History = require('history');

let Router = ReactRouter.Router;
let RouterContext = ReactRouter.RouterContext;

module.exports = getEntry;

function getEntry(options) {
  let reactOnClient =
    (options.reactOnClient === 'undefined') ?
      true :
      !!options.reactOnClient;
  let reactHelmet =
    (options.reactHelmet === 'undefined' &&
      typeof reactHelmet.rewind === 'function') ?
      undefined :
      options.reactHelmet;
  let additionalAssets = options.additionalAssets || {};
  if (Object.keys(additionalAssets).length < 1) {
    additionalAssets = {};
  }
  let routes = options.routes;
  if (!routes) {
    throw 'Routes are necessary';
  }

  if (reactOnClient && typeof document !== 'undefined') {
    renderClient(); //Disabled for now
  }

  return renderServer;

  function renderClient() {
    let history = ReactRouter.useRouterHistory(
      History.createHistory)(
      { queryKey: false });
    var outlet = document.getElementById('outlet');
    ReactDom.render(
      <Router history={history} routes={routes} />,
      outlet);
    console.log('ReactJs has taken over page rendering.');
  }

  function renderServer(locals, callback) {
    let history = History.createMemoryHistory();
    let location = history.createLocation(locals.path);

    ReactRouter.match({
      routes,
      location,
    }, (err, redirectLocation, renderProps) => {
      if (!err && !redirectLocation && !renderProps) {
        return callback(`No route found matching: ${locals.path}, ${JSON.stringify(location)}`);
      }
      if (!!err || !renderProps) {
        return callback(err || 'Missing renderProps');
      }
      let post;
      let props =
        (!!options.routeMetadata &&
         options.routeMetadata.props);
      if (!!props &&
          !!props.routes &&
          !!props.aliases) {
        let path = props.aliases[locals.path] || locals.path;
        post = props.routes[path];
      }
      post = post || {};
      renderProps = Object.assign(renderProps, post);
      let title = !!post.meta && post.meta.title;

      let rendered = ReactDomServer.renderToStaticMarkup(
        <RouterContext {...renderProps} />);
      let helmet = {
        htmlAttributes: '',
        title: '',
        meta: '',
        link: '',
      };
      if (!!reactHelmet) {
        helmet = Object.assign(helmet, reactHelmet.rewind());
      }

      let assets = Object.assign(additionalAssets, locals.assets);
      let html = templateHtml({
        title: title || locals.title || '',
        rendered: rendered,
        path: locals.path,
        assets,
        helmet,
      });
      console.log(`HTML generated for ${renderProps.location.pathname}`);

      callback(undefined, html);
    });
  }

  function templateHtml(locals) {
    let assetTags = '';
    if (reactOnClient) {
      Object.keys(locals.assets).forEach((key) => {
        var asset = locals.assets[key];
        if (!asset.match(/^[a-z]+\:\/\//)) {
          // if no protocol is specified, make the path root-relative
          asset = `/${asset}`;
        }
        if (asset.match(/\.css$/)) {
          assetTags += `\n<link rel="stylesheet" type="text/css" href="${asset}">`;
        }
        else {
          // default to <script> tag
          assetTags += `\n<script type="text/javascript" src="${asset}"></script>`;
        }
      });
    }
    let head = (!!reactHelmet) ?
      (`<head ${locals.helmet.htmlAttributes.toString()}>
  <meta charset="utf-8" />
  ${locals.helmet.title.toString()}
  ${locals.helmet.meta.toString()}
  ${locals.helmet.link.toString()}
</head>`) :
      (`<head>
  <meta charset="utf-8" />
  <title>${locals.title}</title>
</head>`);
    return `<!DOCTYPE html>
<html id="html" class="html">
  ${head}
  <body>
    <div id="outlet" class="outlet">
      ${locals.rendered}
    </div>
    ${assetTags}
  </body>
</html>`;
  }
}


