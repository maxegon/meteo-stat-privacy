// Xcode 27 rifiuta i Pods con IPHONEOS_DEPLOYMENT_TARGET < 15.0 (es. ReachabilitySwift 12.0,
// RNSVG 12.4, AsyncStorage 13.4). Alza a 15.0 il target dei Pods che stanno sotto.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# withPodsDeploymentTarget';
const SNIPPET = `    ${MARKER}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.0
          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
        end
      end
    end
`;

module.exports = function withPodsDeploymentTarget(config) {
  return withDangerousMod(config, ['ios', (cfg) => {
    const file = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
    let src = fs.readFileSync(file, 'utf8');
    if (!src.includes(MARKER)) {
      src = src.replace(/(\n\s*post_install do \|installer\|\n)/, `$1${SNIPPET}`);
      fs.writeFileSync(file, src);
    }
    return cfg;
  }]);
};
