/**
 * Config plugin: copies the AlarmKit core (scheduler + App Intents) into the MAIN app target.
 *
 * Why: App Intents (the lock-screen buttons) are discovered by Xcode's metadata extraction only
 * when they are compiled into the app target or a dynamic framework. Expo local modules are built
 * as CocoaPods static frameworks, where intents are silently ignored. So the thin JS bridge lives
 * in modules/pill-alarm (a pod) and the real AlarmKit code lives in native/ios, injected here.
 */
const { withXcodeProject, IOSConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const GROUP = 'PillAlarm';

module.exports = function withPillAlarmNative(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectName = config.modRequest.projectName;
    const srcDir = path.join(config.modRequest.projectRoot, 'native', 'ios');
    const destDir = path.join(config.modRequest.platformProjectRoot, projectName, GROUP);

    fs.mkdirSync(destDir, { recursive: true });

    const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.swift'));
    for (const file of files) {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      const relPath = `${projectName}/${GROUP}/${file}`;
      if (!project.hasFile(relPath)) {
        IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
          filepath: relPath,
          groupName: projectName,
          project,
        });
      }
    }
    return config;
  });
};
