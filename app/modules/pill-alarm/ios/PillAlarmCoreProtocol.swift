import Foundation

/// Contract between the Expo bridge (this pod) and the AlarmKit core compiled into the app target.
/// The app-target class is named `PillAlarmCore` and is looked up at runtime via NSClassFromString,
/// because a static-framework pod cannot link against the app target at build time.
@objc public protocol PillAlarmCoreProtocol: NSObjectProtocol {
  func requestAuthorization(_ completion: @escaping (String?, NSError?) -> Void)
  func authorizationState() -> String
  /// options keys: id (uuid string), fireAt (ms since epoch), title, buttonText, buttonSymbol,
  /// sound (file name or empty for system default), tintHex, snoozeMinutes (0 = test alarm: Stop only,
  /// >0 = iOS Snooze with a countdown), lang, countdownTitle, ringsInLabel, stopLabel
  func schedule(_ options: [String: Any], completion: @escaping (NSError?) -> Void)
  func cancel(_ id: String) -> NSError?
  func cancelAll() -> NSError?
  func listScheduled() -> [String]
  /// "id|state" for every alarm (scheduled / countdown / paused / alerting).
  func listAlarms() -> [String]
  /// Alarm and banner ids a snooze replaced (the app must not re-create them for now).
  func listSkipped() -> [String]
}
