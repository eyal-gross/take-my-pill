/**
 * Config plugin: lift every CocoaPods target to a minimum iOS deployment target.
 *
 * Why: Xcode 27 refuses to build pods that declare an iOS deployment target below 15.0
 * (e.g. resource-bundle targets that keep the podspec's old minimum). The app itself targets
 * 26.1; this only touches third-party pod targets so the archive step stops failing.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MIN_IOS = '15.0';
const MARKER = '# [take-my-pill] min deployment target';

module.exports = function withMinDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (contents.includes(MARKER)) return config;

      const hook = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        current = build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || current.to_f < ${MIN_IOS}.to_f
          build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_IOS}'
        end
      end
    end
`;
      const anchor = 'post_install do |installer|';
      if (!contents.includes(anchor)) {
        throw new Error('[withMinDeploymentTarget] could not find post_install block in Podfile');
      }
      contents = contents.replace(anchor, `${anchor}${hook}`);
      fs.writeFileSync(podfile, contents);
      return config;
    },
  ]);
};
