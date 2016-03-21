import {ManifestParser} from './manifest-parser.js';

var hasManifest = _ => {
  return !!document.querySelector('link[rel=manifest]');
};

var parseManifest = function() {
  var link = document.querySelector('link[rel=manifest]');

  if (!link) {
    return {};
  }

  var request = new XMLHttpRequest();
  request.open('GET', link.href, false);  // `false` makes the request synchronous
  request.send(null);

  if (request.status === 200) {
    /* eslint-disable new-cap*/
    let parserInstance = (window.__lighthouse.ManifestParser)();
    /* eslint-enable new-cap*/
    parserInstance.parse(request.responseText);
    return parserInstance.manifest();
  }

  throw new Error('Unable to fetch manifest at ' + link);
};

var hasManifestThemeColor = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.theme_color;
};

var hasManifestBackgroundColor = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.background_color;
};

var hasManifestIcons = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.icons;
};

var hasManifestIcons192 = _ => {
  let manifest = __lighthouse.parseManifest();

  if (!manifest.icons) {
    return false;
  }

  return !!manifest.icons.find(function(i) {
    return i.sizes.has('192x192');
  });
};

var hasManifestShortName = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.short_name;
};

var hasManifestName = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.name;
};

var hasManifestStartUrl = _ => {
  let manifest = __lighthouse.parseManifest();

  return !!manifest.start_url;
};

var hasCanonicalUrl = _ => {
  var link = document.querySelector('link[rel=canonical]');

  return !!link;
};

var isControlledByServiceWorker = _ => {
  return !!(navigator.serviceWorker.controller);
};

var hasServiceWorkerRegistration = _ => {
  return new Promise((resolve, reject) => {
    navigator.serviceWorker.getRegistration().then(r => {
      if (r.active) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
};

var isOnHTTPS = _ => location.protocol === 'https:';

function injectIntoTab(chrome, fnPair) {
  var singleLineFn = fnPair[1].toString();

  return new Promise((res, reject) => {
    chrome.tabs.executeScript(null, {
      code: `window.__lighthouse = window.__lighthouse || {};
      window.__lighthouse['${fnPair[0]}'] = ${singleLineFn}`
    }, ret => {
      res(ret);
    });
  });
}

function runAudits(chrome, audits) {
  const fnString = audits.reduce((prevValue, audit, index) => {
    return prevValue + (index > 0 ? ',' : '') +
        `new Promise(function(resolve, reject) {
          resolve(Promise.all([
            Promise.resolve("${audit[1]}"),
            (${audit[0].toString()})()
          ]));
        })`;
  }, '');

  chrome.tabs.executeScript(null, {
    code: `Promise.all([${fnString}]).then(__lighthouse.postAuditResults)`
  });
}

function postAuditResults(results) {
  chrome.runtime.sendMessage({onAuditsComplete: results});
}

var functionsToInject = [
  ['ManifestParser', ManifestParser],
  ['parseManifest', parseManifest],
  ['postAuditResults', postAuditResults]
];

var audits = [
  [hasManifest, 'Has a manifest'],
  [isOnHTTPS, 'Site is on HTTPS'],
  [hasCanonicalUrl, 'Site has a canonical URL'],
  [hasManifestThemeColor, 'Site manifest has theme_color'],
  [hasManifestBackgroundColor, 'Site manifest has background_color'],
  [hasManifestStartUrl, 'Site manifest has start_url'],
  [hasManifestShortName, 'Site manifest has short_name'],
  [hasManifestName, 'Site manifest has name'],
  [hasManifestIcons, 'Site manifest has icons defined'],
  [hasManifestIcons192, 'Site manifest has 192px icon'],
  [isControlledByServiceWorker, 'Site is currently controlled by a service worker'],
  [hasServiceWorkerRegistration, 'Site is has a service worker registration']
];

export function runPwaAudits(chrome) {
  return new Promise((resolve, reject) => {
    chrome.runtime.onMessage.addListener(message => {
      if (!message.onAuditsComplete) {
        return;
      }

      resolve(message.onAuditsComplete.reduce((prev, result, index) => {
        return prev + (index > 0 ? '<br/>' : '') +
          `${result[0]}: <strong>${result[1]}</strong>`;
      }, ''));
    });

    Promise.all(functionsToInject.map(fnPair => injectIntoTab(chrome, fnPair)))
        .then(_ => runAudits(chrome, audits))
        .catch(err => {
          return 'ERROR: ' + err;
        });
  });
}
