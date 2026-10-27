//
//  PillAlarmCore.swift
//  Take My Pill
//
//  Compiled into the MAIN app target by plugins/withPillAlarmNative.js.
//  Holds everything that must be visible to iOS's App Intents metadata extraction:
//  the AlarmKit scheduler and the lock-screen intents.
//
//  The alarm metadata type (PillAlarmMetadata) and the countdown's Stop intent live in
//  targets/snooze/_shared/PillAlarmShared.swift, compiled into both the app and the widget.
//

import Foundation
import AlarmKit
import ActivityKit
import AppIntents
import SwiftUI
import UserNotifications
import PillAlarm

// MARK: - Shared keys (mirrored in modules/pill-alarm/ios/PillAlarmModule.swift)

private enum Keys {
  static let events = "pillalarm.events"
  static let tapToOpenTitle = "pillalarm.strings.tapToOpenTitle"
  static let tapToOpenBody = "pillalarm.strings.tapToOpenBody"
  /// [alarmId: fireAt ms] of every alarm we scheduled, so Snooze can find the ones inside its window.
  static let fireTimes = "pillalarm.fireTimes"
  /// [alarmId: snooze minutes] per scheduled alarm.
  static let snoozeMinutes = "pillalarm.snoozeMinutes"
  /// [alarm or banner id: until ms] that a snooze replaced; the app must not re-create them.
  static let skipped = "pillalarm.skipped"
}

// MARK: - Event log (read by JS via drainEvents)

enum PillAlarmEvents {
  static func record(action: String, alarmId: String, extra: [String: Any] = [:]) {
    let defaults = UserDefaults.standard
    var events = defaults.array(forKey: Keys.events) as? [[String: Any]] ?? []
    var event: [String: Any] = [
      "action": action,
      "alarmId": alarmId.lowercased(),
      "at": Date().timeIntervalSince1970 * 1000,
    ]
    for (k, v) in extra { event[k] = v }
    events.append(event)
    // keep the log bounded
    if events.count > 50 { events.removeFirst(events.count - 50) }
    defaults.set(events, forKey: Keys.events)
  }

  /// After a slide-to-stop, leave a quiet banner so the path back into the app stays visible.
  static func postTapToOpen(alarmId: String) async {
    let defaults = UserDefaults.standard
    let title = defaults.string(forKey: Keys.tapToOpenTitle) ?? "Take My Pill"
    let body = defaults.string(forKey: Keys.tapToOpenBody) ?? "Tap to open"

    let content = UNMutableNotificationContent()
    content.title = title
    content.body = body
    content.sound = nil
    content.interruptionLevel = .timeSensitive
    content.threadIdentifier = "pill-tap-to-open"
    content.userInfo = ["alarmId": alarmId, "kind": "tapToOpen"]

    let request = UNNotificationRequest(
      identifier: "tap-to-open-\(alarmId)",
      content: content,
      trigger: nil
    )
    try? await UNUserNotificationCenter.current().add(request)
  }
}

// MARK: - App Intents (the lock-screen controls)

/// Runs when the user uses the system "slide to stop". The cycle continues.
struct StopPillAlarmIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Stop pill alarm"
  static var description = IntentDescription("Silences the current pill alarm.")
  static var isDiscoverable: Bool = false

  @Parameter(title: "Alarm ID")
  var alarmId: String

  init() {
    self.alarmId = ""
  }

  init(alarmId: String) {
    self.alarmId = alarmId
  }

  func perform() async throws -> some IntentResult {
    PillAlarmEvents.record(action: "stopped", alarmId: alarmId)
    if let uuid = UUID(uuidString: alarmId) {
      try? AlarmManager.shared.stop(id: uuid)
    }
    await PillAlarmEvents.postTapToOpen(alarmId: alarmId)
    return .result()
  }
}

/// Kept so alarms scheduled by builds 6-8 ("Stop & open app") still work until they are rebuilt.
struct OpenPillAppIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Open Take My Pill"
  static var description = IntentDescription("Stops the alarm and opens the app.")
  static var openAppWhenRun: Bool = true
  static var isDiscoverable: Bool = false

  @Parameter(title: "Alarm ID")
  var alarmId: String

  init() {
    self.alarmId = ""
  }

  init(alarmId: String) {
    self.alarmId = alarmId
  }

  func perform() async throws -> some IntentResult {
    if let uuid = UUID(uuidString: alarmId) {
      try? AlarmManager.shared.stop(id: uuid)
    }
    PillAlarmEvents.record(action: "opened", alarmId: alarmId)
    return .result()
  }
}

/// Runs alongside the system's own Snooze (the alarm itself goes into AlarmKit's countdown state).
/// Bookkeeping only: log the snooze and skip our alarms / banners that would ring during it.
struct SnoozeBookkeepingIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Snooze pill alarm"
  static var description = IntentDescription("Rings again after the snooze length.")
  static var isDiscoverable: Bool = false

  @Parameter(title: "Alarm ID")
  var alarmId: String

  init() {
    self.alarmId = ""
  }

  init(alarmId: String) {
    self.alarmId = alarmId
  }

  func perform() async throws -> some IntentResult {
    await PillAlarmScheduler.didSnooze(alarmId: alarmId.lowercased())
    return .result()
  }
}

// MARK: - Scheduler

enum PillAlarmScheduler {
  private static func doubles(_ key: String) -> [String: Double] {
    UserDefaults.standard.dictionary(forKey: key) as? [String: Double] ?? [:]
  }

  private static func liveIds() -> Set<String>? {
    guard let alarms = try? AlarmManager.shared.alarms else { return nil }
    return Set(alarms.map { $0.id.uuidString.lowercased() })
  }

  /// Remember fire time + snooze length per alarm; forget alarms iOS no longer has.
  private static func remember(id: String, fireAtMs: Double, snoozeMinutes: Double) {
    var fire = doubles(Keys.fireTimes)
    var snooze = doubles(Keys.snoozeMinutes)
    if let live = liveIds() {
      fire = fire.filter { live.contains($0.key) }
      snooze = snooze.filter { live.contains($0.key) }
    }
    fire[id] = fireAtMs
    snooze[id] = snoozeMinutes
    UserDefaults.standard.set(fire, forKey: Keys.fireTimes)
    UserDefaults.standard.set(snooze, forKey: Keys.snoozeMinutes)
  }

  static func schedule(_ options: [String: Any]) async throws {
    guard
      let idString = (options["id"] as? String)?.lowercased(),
      let uuid = UUID(uuidString: idString),
      let fireAtMs = options["fireAt"] as? Double
    else {
      throw NSError(domain: "PillAlarmCore", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid id or fireAt"])
    }

    let title = options["title"] as? String ?? "Take your pill"
    let buttonText = options["buttonText"] as? String ?? "Snooze"
    let buttonSymbol = options["buttonSymbol"] as? String ?? "zzz"
    let soundName = options["sound"] as? String ?? ""
    let tintHex = options["tintHex"] as? String ?? "#E88A9A"
    let snoozeMinutes = options["snoozeMinutes"] as? Double ?? 0
    let metadata = PillAlarmMetadata(
      lang: options["lang"] as? String ?? "en",
      alarmId: idString,
      alertTitle: title,
      countdownTitle: options["countdownTitle"] as? String ?? "Snoozed",
      ringsInLabel: options["ringsInLabel"] as? String ?? "Rings again in",
      stopLabel: options["stopLabel"] as? String ?? "Stop",
      snoozeMinutes: max(1, snoozeMinutes)
    )

    let fireAt = Date(timeIntervalSince1970: fireAtMs / 1000)
    let sound: AlertConfiguration.AlertSound = soundName.isEmpty ? .default : .named(soundName)
    let titleResource = LocalizedStringResource(stringLiteral: title)

    let configuration: AlarmManager.AlarmConfiguration<PillAlarmMetadata>
    if snoozeMinutes > 0 {
      // Real alarm: iOS's own Snooze. The same alarm counts down, then alerts again identically.
      let snoozeButton = AlarmButton(
        text: LocalizedStringResource(stringLiteral: buttonText),
        textColor: .white,
        systemImageName: buttonSymbol
      )
      let alert = AlarmPresentation.Alert(
        title: titleResource,
        secondaryButton: snoozeButton,
        secondaryButtonBehavior: .countdown
      )
      // Shown by iOS only when our Live Activity can't be (e.g. after a restart before first unlock).
      let countdown = AlarmPresentation.Countdown(
        title: LocalizedStringResource(stringLiteral: metadata.countdownTitle),
        pauseButton: nil
      )
      let attributes = AlarmAttributes<PillAlarmMetadata>(
        presentation: AlarmPresentation(alert: alert, countdown: countdown, paused: nil),
        metadata: metadata,
        tintColor: Color(hex: tintHex)
      )
      configuration = AlarmManager.AlarmConfiguration<PillAlarmMetadata>(
        countdownDuration: Alarm.CountdownDuration(preAlert: nil, postAlert: snoozeMinutes * 60),
        schedule: .fixed(fireAt),
        attributes: attributes,
        stopIntent: StopPillAlarmIntent(alarmId: idString),
        secondaryIntent: SnoozeBookkeepingIntent(alarmId: idString),
        sound: sound
      )
    } else {
      // Test alarm (Normal sound preview): Stop only.
      let alert = AlarmPresentation.Alert(title: titleResource, secondaryButton: nil, secondaryButtonBehavior: nil)
      let attributes = AlarmAttributes<PillAlarmMetadata>(
        presentation: AlarmPresentation(alert: alert, countdown: nil, paused: nil),
        metadata: metadata,
        tintColor: Color(hex: tintHex)
      )
      configuration = AlarmManager.AlarmConfiguration<PillAlarmMetadata>(
        countdownDuration: nil,
        schedule: .fixed(fireAt),
        attributes: attributes,
        stopIntent: StopPillAlarmIntent(alarmId: idString),
        secondaryIntent: nil,
        sound: sound
      )
    }

    _ = try await AlarmManager.shared.schedule(id: uuid, configuration: configuration)
    remember(id: idString, fireAtMs: fireAtMs, snoozeMinutes: snoozeMinutes)
  }

  /// After Snooze: log it, and skip our alarms and banners that fall inside the snooze window
  /// (the snooze replaces them - no double ring).
  static func didSnooze(alarmId: String) async {
    let minutes = doubles(Keys.snoozeMinutes)[alarmId] ?? 5
    let nowMs = Date().timeIntervalSince1970 * 1000
    let endMs = nowMs + minutes * 60 * 1000
    var skipped = doubles(Keys.skipped).filter { $0.value > nowMs }

    for (id, fireAt) in doubles(Keys.fireTimes) where id != alarmId && fireAt > nowMs && fireAt <= endMs {
      if let uuid = UUID(uuidString: id) {
        try? AlarmManager.shared.cancel(id: uuid)
      }
      skipped[id] = endMs
    }

    let center = UNUserNotificationCenter.current()
    let pending = await center.pendingNotificationRequests()
    var bannerIds: [String] = []
    for request in pending {
      guard let next = (request.trigger as? UNCalendarNotificationTrigger)?.nextTriggerDate()
        ?? (request.trigger as? UNTimeIntervalNotificationTrigger)?.nextTriggerDate() else { continue }
      let t = next.timeIntervalSince1970 * 1000
      if t > nowMs && t <= endMs {
        bannerIds.append(request.identifier)
        skipped[request.identifier.lowercased()] = endMs
      }
    }
    if !bannerIds.isEmpty { center.removePendingNotificationRequests(withIdentifiers: bannerIds) }

    UserDefaults.standard.set(skipped, forKey: Keys.skipped)
    PillAlarmEvents.record(action: "snoozed", alarmId: alarmId, extra: ["until": endMs])
  }

  static func listSkipped() -> [String] {
    let nowMs = Date().timeIntervalSince1970 * 1000
    let all = doubles(Keys.skipped)
    let keep = all.filter { $0.value > nowMs }
    if keep.count != all.count { UserDefaults.standard.set(keep, forKey: Keys.skipped) }
    return Array(keep.keys)
  }

  /// "id|state" for every alarm iOS holds: scheduled, countdown, paused, alerting.
  static func listAlarms() -> [String] {
    guard let alarms = try? AlarmManager.shared.alarms else { return [] }
    return alarms.map { alarm in
      let state: String
      switch alarm.state {
      case .scheduled: state = "scheduled"
      case .countdown: state = "countdown"
      case .paused: state = "paused"
      case .alerting: state = "alerting"
      @unknown default: state = "unknown"
      }
      return "\(alarm.id.uuidString.lowercased())|\(state)"
    }
  }
}

// MARK: - Core (ObjC-visible so the pod can find it with NSClassFromString)

@objc(PillAlarmCore)
public class PillAlarmCore: NSObject, PillAlarmCoreProtocol {

  public override init() {
    super.init()
  }

  private func describe(_ state: AlarmManager.AuthorizationState) -> String {
    switch state {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .notDetermined: return "notDetermined"
    @unknown default: return "unknown"
    }
  }

  private func nsError(_ error: Error) -> NSError {
    let ns = error as NSError
    return NSError(
      domain: "PillAlarmCore",
      code: ns.code,
      userInfo: [NSLocalizedDescriptionKey: String(describing: error)]
    )
  }

  public func requestAuthorization(_ completion: @escaping (String?, NSError?) -> Void) {
    Task {
      do {
        let state = try await AlarmManager.shared.requestAuthorization()
        completion(describe(state), nil)
      } catch {
        completion(nil, nsError(error))
      }
    }
  }

  public func authorizationState() -> String {
    return describe(AlarmManager.shared.authorizationState)
  }

  public func schedule(_ options: [String: Any], completion: @escaping (NSError?) -> Void) {
    Task {
      do {
        try await PillAlarmScheduler.schedule(options)
        completion(nil)
      } catch {
        completion(nsError(error))
      }
    }
  }

  public func listAlarms() -> [String] {
    return PillAlarmScheduler.listAlarms()
  }

  public func listSkipped() -> [String] {
    return PillAlarmScheduler.listSkipped()
  }

  public func cancel(_ id: String) -> NSError? {
    guard let uuid = UUID(uuidString: id) else {
      return NSError(domain: "PillAlarmCore", code: 2,
                     userInfo: [NSLocalizedDescriptionKey: "Invalid UUID \(id)"])
    }
    do {
      try AlarmManager.shared.cancel(id: uuid)
      return nil
    } catch {
      return nsError(error)
    }
  }

  public func cancelAll() -> NSError? {
    do {
      for alarm in try AlarmManager.shared.alarms {
        try AlarmManager.shared.cancel(id: alarm.id)
      }
      return nil
    } catch {
      return nsError(error)
    }
  }

  public func listScheduled() -> [String] {
    do {
      return try AlarmManager.shared.alarms.map { $0.id.uuidString.lowercased() }
    } catch {
      return []
    }
  }
}

// MARK: - Color helper

private extension Color {
  init(hex: String) {
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s.removeFirst() }
    var value: UInt64 = 0
    Scanner(string: s).scanHexInt64(&value)
    let r, g, b: Double
    if s.count == 6 {
      r = Double((value >> 16) & 0xFF) / 255
      g = Double((value >> 8) & 0xFF) / 255
      b = Double(value & 0xFF) / 255
    } else {
      r = 0.91; g = 0.54; b = 0.60
    }
    self.init(red: r, green: g, blue: b)
  }
}
